# Plan Modèle ML - Card Grading System

**Agent**: tensorflow-ml-agent
**Date**: 2026-01-10
**Version**: 1.0

---

## 1. Analyse du besoin

### Objectif
Créer un système ML capable d'analyser 2 images (recto/verso) d'une carte à collectionner et d'attribuer 5 scores individuels (1-10) selon les critères PCA/PSA.

### Contraintes techniques
- **Performance**: Inférence < 2 secondes pour 2 images
- **Taille modèle**: < 100MB (déploiement mobile futur)
- **Backend**: NestJS avec @tensorflow/tfjs-node
- **Input**: Images smartphone (qualité variable, min 640x480)
- **Output**: JSON structuré avec scores + détails + confidence

### Défis spécifiques
1. **Qualité variable des photos**: éclairage, angle, flou, reflets
2. **Diversité des cartes**: Pokémon, sports, différentes époques, langues
3. **Critères subjectifs**: le grading PCA/PSA a une part d'interprétation humaine
4. **Dataset limité**: peu de données annotées disponibles publiquement
5. **Strictement PCA**: plus strict que PSA sur blanchiment arêtes/coins

---

## 2. Stratégie Recommandée : Transfer Learning + Multi-Task

### Pourquoi NOT from scratch ?
- **Manque de données**: Besoin de 50k+ images annotées pour un CNN from scratch
- **Temps d'entraînement**: Des semaines sur GPU
- **Risque d'overfitting**: Sur un dataset limité de cartes

### Approche recommandée : Hybrid Transfer Learning

#### Phase 1 - MVP (2-4 semaines)
**Transfer Learning avec fine-tuning**

**Modèle de base**: EfficientNetV2-S ou ResNet50V2
- Pré-entraîné sur ImageNet
- Bonnes performances sur classification d'objets
- Taille raisonnable (30-50MB)

**Architecture**:
```
Input (224x224x3)
    ↓
EfficientNetV2-S (frozen layers)
    ↓
Global Average Pooling
    ↓
Dense(512, relu) + Dropout(0.3)
    ↓
┌────────┬──────────┬────────┬─────────┬──────────────┐
│        │          │        │         │              │
Centering Corners  Edges  Surface  PrintQuality
(10 units) (10)     (10)    (10)      (10)
softmax   softmax  softmax softmax   softmax
```

**Justification**:
- 5 têtes indépendantes = apprentissage spécialisé par critère
- Softmax sur 10 classes (scores 1-10) plutôt que régression
- Transfer learning = convergence rapide avec peu de données

#### Phase 2 - Production (4-8 semaines)
**Architecture avancée avec détection de régions**

```
Input Front (224x224x3)    Input Back (224x224x3)
         ↓                          ↓
    EfficientNetV2              EfficientNetV2
    (shared weights)            (shared weights)
         ↓                          ↓
         └──────────┬───────────────┘
                    ↓
              Feature Fusion
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    Centering   Corners    Edges
     Branch     Branch     Branch
         ↓          ↓          ↓
    Détection  Analyse    Analyse
    bordures   4 coins    4 arêtes
         ↓          ↓          ↓
         └──────────┴──────────┘
                    ↓
              Surface Branch
                    ↓
          Analyse texture globale
                    ↓
              Multi-Output
    (scores + détails + confidence)
```

**Améliorations**:
- Backbone partagé entre front/back (économie paramètres)
- Branches spécialisées avec attention spatiale
- Détection de régions (corners, edges) via feature maps
- Analyse texture avec filtres Gabor ou auto-encodeurs

---

## 3. Architecture Technique Détaillée

### 3.1 Input Pipeline

#### Preprocessing (Python - packages/ml/preprocessing/)

**1. Détection de carte (Card Detection)**
```python
def detect_card(image: np.ndarray) -> tuple[np.ndarray, dict]:
    """
    Détecte les contours de la carte et extrait la région d'intérêt.

    Returns:
        cropped_card: Image de la carte isolée
        metadata: {corners: [(x,y)], confidence: float, angle: float}
    """
    # 1. Conversion grayscale
    # 2. Détection de contours (Canny + findContours)
    # 3. Approximation polygonale (approxPolyDP)
    # 4. Transformation perspective (warpPerspective)
    # 5. Validation dimensions (ratio ~2.5:3.5 pour cartes standard)
```

**2. Normalisation**
```python
def normalize_card_image(card: np.ndarray) -> np.ndarray:
    """
    Normalise l'image pour l'inférence.

    Steps:
        - Resize à (224, 224)
        - Conversion RGB
        - Normalisation [0, 1] ou ImageNet stats
        - Correction gamma si nécessaire
    """
```

**3. Quality Check**
```python
def assess_image_quality(image: np.ndarray) -> dict:
    """
    Évalue la qualité de la photo pour ajuster confidence.

    Checks:
        - Blur detection (Laplacian variance)
        - Lighting uniformity (histogram analysis)
        - Resolution minimale (>= 640x480)
        - Orientation (EXIF data)

    Returns:
        {blur_score: float, lighting_score: float, is_valid: bool}
    """
```

#### Augmentation (Training only)
```python
augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.05),  # ±5° rotation
    layers.RandomZoom(0.1),
    layers.RandomBrightness(0.2),
    layers.RandomContrast(0.2),
])
```

**Augmentations spécifiques grading**:
- Simulation reflets (ajout zones blanches aléatoires)
- Simulation usure coins (masques corners)
- Simulation rayures (lignes fines aléatoires)

### 3.2 Modèle MVP (Phase 1)

```python
# packages/ml/training/models/mvp_grading_model.py

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

def build_mvp_model(
    input_shape: tuple[int, int, int] = (224, 224, 3),
    num_classes: int = 10,  # Scores 1-10
    backbone: str = "efficientnetv2-s"
) -> keras.Model:
    """
    Construit le modèle MVP avec architecture multi-head.

    Args:
        input_shape: Dimensions input (H, W, C)
        num_classes: Nombre de scores possibles (10)
        backbone: Nom du modèle pré-entraîné

    Returns:
        keras.Model compilé
    """

    # Input
    input_front = layers.Input(shape=input_shape, name="front_image")
    input_back = layers.Input(shape=input_shape, name="back_image")

    # Backbone partagé
    if backbone == "efficientnetv2-s":
        base_model = keras.applications.EfficientNetV2S(
            include_top=False,
            weights="imagenet",
            input_shape=input_shape
        )
    elif backbone == "resnet50v2":
        base_model = keras.applications.ResNet50V2(
            include_top=False,
            weights="imagenet",
            input_shape=input_shape
        )

    # Freeze early layers
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    # Feature extraction pour front et back
    features_front = base_model(input_front)
    features_back = base_model(input_back)

    # Global Average Pooling
    pooled_front = layers.GlobalAveragePooling2D()(features_front)
    pooled_back = layers.GlobalAveragePooling2D()(features_back)

    # Concatenation des features
    merged = layers.Concatenate()([pooled_front, pooled_back])

    # Shared dense layer
    x = layers.Dense(512, activation="relu", name="shared_dense")(merged)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.2)(x)

    # Multi-head outputs
    centering = layers.Dense(num_classes, activation="softmax", name="centering")(x)
    corners = layers.Dense(num_classes, activation="softmax", name="corners")(x)
    edges = layers.Dense(num_classes, activation="softmax", name="edges")(x)
    surface = layers.Dense(num_classes, activation="softmax", name="surface")(x)
    print_quality = layers.Dense(num_classes, activation="softmax", name="print_quality")(x)

    # Confidence output (régression 0-1)
    confidence = layers.Dense(1, activation="sigmoid", name="confidence")(x)

    # Modèle final
    model = keras.Model(
        inputs=[input_front, input_back],
        outputs={
            "centering": centering,
            "corners": corners,
            "edges": edges,
            "surface": surface,
            "print_quality": print_quality,
            "confidence": confidence
        }
    )

    return model
```

### 3.3 Fonction de Loss

```python
def custom_grading_loss(y_true, y_pred):
    """
    Loss customisée pour le grading.

    Combine:
    - Categorical crossentropy pour les scores
    - Pénalité sur erreurs de +/- 2 points (très grave en grading)
    - Weight sur critères PCA stricts (edges, corners)
    """

    # Crossentropy de base
    cce = tf.keras.losses.CategoricalCrossentropy()
    base_loss = cce(y_true, y_pred)

    # Pénalité erreur grave (off by 2+)
    true_class = tf.argmax(y_true, axis=-1)
    pred_class = tf.argmax(y_pred, axis=-1)
    error_magnitude = tf.abs(true_class - pred_class)
    penalty = tf.where(error_magnitude >= 2, 2.0, 1.0)

    weighted_loss = base_loss * tf.cast(penalty, tf.float32)

    return tf.reduce_mean(weighted_loss)

# Compilation avec weights différents par output
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=1e-4),
    loss={
        "centering": custom_grading_loss,
        "corners": custom_grading_loss,
        "edges": custom_grading_loss,
        "surface": custom_grading_loss,
        "print_quality": custom_grading_loss,
        "confidence": "mse"
    },
    loss_weights={
        "centering": 1.0,
        "corners": 1.5,   # PCA strict sur corners
        "edges": 1.5,     # PCA strict sur edges
        "surface": 1.2,
        "print_quality": 1.0,
        "confidence": 0.5
    },
    metrics={
        "centering": ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2)],
        "corners": ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2)],
        "edges": ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2)],
        "surface": ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2)],
        "print_quality": ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2)],
        "confidence": ["mae"]
    }
)
```

### 3.4 Training Pipeline

```python
# packages/ml/training/train.py

import argparse
import yaml
from pathlib import Path
import tensorflow as tf
from typing import Dict, Any

def load_config(config_path: str) -> Dict[str, Any]:
    """Charge la config YAML."""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def create_dataset(
    data_dir: Path,
    batch_size: int,
    is_training: bool = True
) -> tf.data.Dataset:
    """
    Crée un tf.data.Dataset depuis les images annotées.

    Structure attendue:
        data_dir/
            cards/
                card_001/
                    front.jpg
                    back.jpg
                    labels.json  # {centering: 8, corners: 9, ...}
                card_002/
                    ...
    """
    # TODO: Implémenter parsing des fichiers
    # TODO: Appliquer augmentation si is_training
    # TODO: Batching et prefetch
    pass

def train_model(config: Dict[str, Any]):
    """Fonction principale d'entraînement."""

    # Seeds pour reproductibilité
    tf.random.set_seed(config['training']['seed'])

    # Datasets
    train_ds = create_dataset(
        Path(config['data']['train_dir']),
        config['training']['batch_size'],
        is_training=True
    )
    val_ds = create_dataset(
        Path(config['data']['val_dir']),
        config['training']['batch_size'],
        is_training=False
    )

    # Modèle
    model = build_mvp_model(
        input_shape=tuple(config['model']['input_shape']),
        num_classes=config['model']['num_classes'],
        backbone=config['model']['backbone']
    )

    # Callbacks
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=config['training']['checkpoint_dir'] + '/model_{epoch:02d}.h5',
            save_best_only=True,
            monitor='val_loss'
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=config['training']['early_stopping_patience'],
            restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5
        ),
        tf.keras.callbacks.TensorBoard(
            log_dir=config['training']['log_dir']
        )
    ]

    # Training
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config['training']['epochs'],
        callbacks=callbacks
    )

    return model, history

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to config YAML")
    args = parser.parse_args()

    config = load_config(args.config)
    model, history = train_model(config)
```

**Config YAML example** (`packages/ml/configs/mvp_training.yaml`):
```yaml
model:
  backbone: "efficientnetv2-s"
  input_shape: [224, 224, 3]
  num_classes: 10

data:
  train_dir: "packages/ml/datasets/train"
  val_dir: "packages/ml/datasets/val"
  test_dir: "packages/ml/datasets/test"

training:
  batch_size: 32
  epochs: 100
  early_stopping_patience: 15
  learning_rate: 0.0001
  seed: 42
  checkpoint_dir: "packages/ml/checkpoints"
  log_dir: "packages/ml/logs"

augmentation:
  enabled: true
  rotation_range: 5
  zoom_range: 0.1
  brightness_range: 0.2
  horizontal_flip: true
```

---

## 4. Dataset Strategy

### 4.1 Données nécessaires

**Format par carte**:
```
card_[id]/
    front.jpg         # Image recto
    back.jpg          # Image verso
    labels.json       # Annotations
    metadata.json     # Infos carte (type, année, etc.)
```

**labels.json structure**:
```json
{
  "overall_grade": 9,
  "scores": {
    "centering": 9,
    "corners": 9,
    "edges": 8,
    "surface": 9,
    "print_quality": 10
  },
  "details": {
    "centering": {
      "left_right_ratio": 48.5,
      "top_bottom_ratio": 51.2,
      "offset_percentage": 2.7
    },
    "corners": {
      "top_left": {"score": 9, "defects": ["minor_whitening"]},
      "top_right": {"score": 10, "defects": []},
      "bottom_left": {"score": 9, "defects": ["minor_whitening"]},
      "bottom_right": {"score": 9, "defects": []}
    },
    "edges": {
      "top": {"score": 8, "defects": ["whitening"]},
      "right": {"score": 9, "defects": []},
      "bottom": {"score": 8, "defects": ["whitening"]},
      "left": {"score": 9, "defects": []}
    },
    "surface": {
      "front": {"score": 9, "defects": ["minor_scratch"]},
      "back": {"score": 9, "defects": []}
    }
  },
  "annotator_id": "expert_001",
  "annotation_date": "2026-01-10",
  "confidence": 0.95
}
```

### 4.2 Sources de données

**Option 1 - Créer son dataset (recommandé pour MVP)**:
1. Acheter 200-300 cartes Pokémon variées (50-200€)
2. Photographier recto/verso avec smartphone
3. Annoter manuellement en suivant guides PCA/PSA
4. Avantage: contrôle total, données réelles

**Option 2 - Scraping/Datasets publics**:
1. eBay certified cards (PSA/PCA slabs) - images + grades visibles
2. PSA/PCA databases (si API disponible)
3. Kaggle datasets (peu probable pour ce niche)
4. Reddit r/PokemonTCG (demander contributions communauté)

**Option 3 - Synthetic data (augmentation)**:
1. Utiliser 50-100 cartes réelles
2. Générer variations avec défauts simulés:
   - Coins usés (masks + blur)
   - Rayures (lignes aléatoires)
   - Mauvais centrage (crop décalé)
   - Problèmes impression (color shift)
3. Annoter automatiquement selon défauts appliqués

**Volumes recommandés**:
- **MVP (transfer learning)**: 500-1000 cartes annotées
  - Train: 70% (350-700)
  - Val: 15% (75-150)
  - Test: 15% (75-150)

- **Production**: 3000-5000 cartes annotées
  - Plus de diversité (Pokémon + Sports + Autres TCG)
  - Distribution équilibrée scores 1-10

### 4.3 Annotation Tool

Créer un outil web simple pour accélérer l'annotation:

```
packages/ml/annotation-tool/
    index.html          # Interface web
    annotate.js         # Logique annotation
    viewer.css          # Styles
```

**Features**:
- Affichage côte à côte front/back
- Sliders pour chaque critère (1-10)
- Zones cliquables pour marquer défauts
- Export JSON automatique
- Raccourcis clavier
- Calcul automatique centrage (si contours détectés)

---

## 5. Output Format

### 5.1 Format JSON API

```typescript
interface GradingResult {
  // Scores principaux
  scores: {
    centering: number;      // 1-10
    corners: number;        // 1-10
    edges: number;          // 1-10
    surface: number;        // 1-10
    printQuality: number;   // 1-10
  };

  // Note finale (minimum de tous les scores)
  overallGrade: number;

  // Label textuel
  gradeLabel: string;  // "Gem Mint", "Mint", "Near Mint", etc.

  // Détails par critère
  details: {
    centering: {
      leftRightRatio: number;      // % (50 = parfait)
      topBottomRatio: number;       // % (50 = parfait)
      offsetPercentage: number;     // % total de déviation
      visualization?: string;       // Base64 image avec overlay
    };

    corners: {
      topLeft: CornerDetail;
      topRight: CornerDetail;
      bottomLeft: CornerDetail;
      bottomRight: CornerDetail;
    };

    edges: {
      top: EdgeDetail;
      right: EdgeDetail;
      bottom: EdgeDetail;
      left: EdgeDetail;
    };

    surface: {
      frontDefects: DefectInfo[];
      backDefects: DefectInfo[];
      overallCondition: string;
    };

    printQuality: {
      hasFactoryDefects: boolean;
      defectTypes: string[];  // ["ink_dot", "miscut", "roller_mark"]
      severity: string;       // "none", "minor", "moderate", "severe"
    };
  };

  // Métadonnées
  metadata: {
    confidence: number;           // 0-1
    modelVersion: string;         // "mvp-v1.0.0"
    processingTimeMs: number;
    imageQuality: {
      front: ImageQualityInfo;
      back: ImageQualityInfo;
    };
    warnings: string[];           // ["low_lighting", "blur_detected"]
  };
}

interface CornerDetail {
  score: number;                  // 1-10
  defects: string[];              // ["whitening", "dent", "fray"]
  severity: string;               // "none", "minor", "moderate", "severe"
  boundingBox?: [number, number, number, number];  // [x, y, w, h]
}

interface EdgeDetail {
  score: number;
  defects: string[];              // ["whitening", "chip", "indent"]
  severity: string;
  length: number;                 // mm affecté
}

interface DefectInfo {
  type: string;                   // "scratch", "dent", "stain", "crease"
  severity: string;
  location: [number, number];     // Coordonnées relative (0-1)
  size: number;                   // Surface affectée en %
}

interface ImageQualityInfo {
  resolution: [number, number];
  blurScore: number;              // 0-1 (1 = net)
  lightingScore: number;          // 0-1 (1 = bien éclairé)
  isValid: boolean;
}
```

### 5.2 Exemple de réponse

```json
{
  "scores": {
    "centering": 9,
    "corners": 8,
    "edges": 8,
    "surface": 9,
    "printQuality": 10
  },
  "overallGrade": 8,
  "gradeLabel": "Near Mint / Mint (NM-MT 8)",
  "details": {
    "centering": {
      "leftRightRatio": 48.5,
      "topBottomRatio": 51.2,
      "offsetPercentage": 2.7
    },
    "corners": {
      "topLeft": {
        "score": 9,
        "defects": ["minor_whitening"],
        "severity": "minor"
      },
      "topRight": {
        "score": 8,
        "defects": ["whitening", "fray"],
        "severity": "moderate"
      },
      "bottomLeft": {
        "score": 9,
        "defects": [],
        "severity": "none"
      },
      "bottomRight": {
        "score": 8,
        "defects": ["whitening"],
        "severity": "moderate"
      }
    },
    "edges": {
      "top": {
        "score": 8,
        "defects": ["whitening"],
        "severity": "moderate",
        "length": 2.5
      },
      "right": {"score": 9, "defects": [], "severity": "minor", "length": 0},
      "bottom": {"score": 8, "defects": ["whitening"], "severity": "moderate", "length": 3.0},
      "left": {"score": 9, "defects": [], "severity": "minor", "length": 0}
    },
    "surface": {
      "frontDefects": [
        {
          "type": "scratch",
          "severity": "minor",
          "location": [0.35, 0.62],
          "size": 0.8
        }
      ],
      "backDefects": [],
      "overallCondition": "excellent"
    },
    "printQuality": {
      "hasFactoryDefects": false,
      "defectTypes": [],
      "severity": "none"
    }
  },
  "metadata": {
    "confidence": 0.87,
    "modelVersion": "mvp-v1.0.0",
    "processingTimeMs": 1450,
    "imageQuality": {
      "front": {
        "resolution": [1920, 1080],
        "blurScore": 0.92,
        "lightingScore": 0.88,
        "isValid": true
      },
      "back": {
        "resolution": [1920, 1080],
        "blurScore": 0.95,
        "lightingScore": 0.85,
        "isValid": true
      }
    },
    "warnings": ["minor_lighting_variation"]
  }
}
```

---

## 6. Déploiement & Intégration NestJS

### 6.1 Export TensorFlow.js

```python
# packages/ml/scripts/export_tfjs.py

import tensorflowjs as tfjs
import tensorflow as tf
from pathlib import Path

def export_model_to_tfjs(
    keras_model_path: str,
    output_dir: str,
    quantization: bool = True
):
    """
    Exporte un modèle Keras vers TensorFlow.js format.

    Args:
        keras_model_path: Chemin vers le .h5 ou SavedModel
        output_dir: Dossier de sortie
        quantization: Appliquer quantization uint8 (réduit taille)
    """

    model = tf.keras.models.load_model(keras_model_path)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if quantization:
        tfjs.converters.save_keras_model(
            model,
            str(output_path),
            quantization_dtype_map={
                'uint8': '*'  # Quantize tous les weights en uint8
            }
        )
    else:
        tfjs.converters.save_keras_model(model, str(output_path))

    print(f"✅ Modèle exporté vers {output_path}")
    print(f"   - model.json (architecture)")
    print(f"   - group*.bin (weights)")

# Usage
if __name__ == "__main__":
    export_model_to_tfjs(
        keras_model_path="packages/ml/checkpoints/best_model.h5",
        output_dir="packages/ml/models/tfjs/mvp-v1",
        quantization=True
    )
```

**Structure fichiers exportés**:
```
packages/ml/models/tfjs/mvp-v1/
    model.json              # Architecture + metadata
    group1-shard1of4.bin    # Weights (4 shards)
    group1-shard2of4.bin
    group1-shard3of4.bin
    group1-shard4of4.bin
```

### 6.2 Intégration NestJS

**Installation dépendances**:
```bash
cd apps/api
npm install @tensorflow/tfjs-node @tensorflow/tfjs-node-gpu  # GPU optionnel
npm install sharp  # Preprocessing images
```

**Service ML** (`apps/api/src/ml/ml.service.ts`):
```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as sharp from 'sharp';
import { GradingResult } from '@shared/types';

@Injectable()
export class MLService implements OnModuleInit {
  private readonly logger = new Logger(MLService.name);
  private model: tf.GraphModel | null = null;
  private readonly MODEL_PATH = 'file://packages/ml/models/tfjs/mvp-v1/model.json';

  async onModuleInit() {
    await this.loadModel();
  }

  private async loadModel(): Promise<void> {
    try {
      this.logger.log('Loading TensorFlow.js model...');
      this.model = await tf.loadGraphModel(this.MODEL_PATH);

      // Warmup avec dummy input
      const dummyFront = tf.zeros([1, 224, 224, 3]);
      const dummyBack = tf.zeros([1, 224, 224, 3]);
      await this.model.predictAsync({ front_image: dummyFront, back_image: dummyBack });
      tf.dispose([dummyFront, dummyBack]);

      this.logger.log('✅ Model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load model:', error);
      throw error;
    }
  }

  async gradeCard(
    frontImageBuffer: Buffer,
    backImageBuffer: Buffer
  ): Promise<GradingResult> {
    const startTime = Date.now();

    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Preprocessing
    const frontTensor = await this.preprocessImage(frontImageBuffer);
    const backTensor = await this.preprocessImage(backImageBuffer);

    // Inference
    const predictions = await this.model.predictAsync({
      front_image: frontTensor,
      back_image: backTensor
    }) as tf.NamedTensorMap;

    // Post-processing
    const result = await this.postprocessPredictions(
      predictions,
      frontImageBuffer,
      backImageBuffer,
      Date.now() - startTime
    );

    // Cleanup
    tf.dispose([frontTensor, backTensor, ...Object.values(predictions)]);

    return result;
  }

  private async preprocessImage(buffer: Buffer): Promise<tf.Tensor4D> {
    // Resize + normalize avec Sharp (plus rapide que TF)
    const processedBuffer = await sharp(buffer)
      .resize(224, 224, { fit: 'fill' })
      .toFormat('rgb')
      .raw()
      .toBuffer();

    // Buffer -> Tensor
    const tensor = tf.tensor3d(
      new Uint8Array(processedBuffer),
      [224, 224, 3],
      'float32'
    );

    // Normalize [0, 255] -> [0, 1]
    const normalized = tensor.div(255.0);

    // Add batch dimension
    const batched = normalized.expandDims(0);

    tf.dispose([tensor, normalized]);
    return batched;
  }

  private async postprocessPredictions(
    predictions: tf.NamedTensorMap,
    frontBuffer: Buffer,
    backBuffer: Buffer,
    processingTime: number
  ): Promise<GradingResult> {
    // Extract scores from softmax outputs
    const centeringScores = await predictions['centering'].array() as number[][];
    const cornersScores = await predictions['corners'].array() as number[][];
    const edgesScores = await predictions['edges'].array() as number[][];
    const surfaceScores = await predictions['surface'].array() as number[][];
    const printScores = await predictions['print_quality'].array() as number[][];
    const confidenceArray = await predictions['confidence'].array() as number[][];

    // Argmax pour récupérer les classes prédites (1-10)
    const centering = this.argmax(centeringScores[0]) + 1;
    const corners = this.argmax(cornersScores[0]) + 1;
    const edges = this.argmax(edgesScores[0]) + 1;
    const surface = this.argmax(surfaceScores[0]) + 1;
    const printQuality = this.argmax(printScores[0]) + 1;
    const confidence = confidenceArray[0][0];

    // Overall grade = min de tous
    const overallGrade = Math.min(centering, corners, edges, surface, printQuality);

    // TODO: Ajouter calculs détails (corners, edges, centering analysis)

    return {
      scores: {
        centering,
        corners,
        edges,
        surface,
        printQuality
      },
      overallGrade,
      gradeLabel: this.getGradeLabel(overallGrade),
      details: {
        // TODO: Implémenter analyses détaillées
        centering: { leftRightRatio: 50, topBottomRatio: 50, offsetPercentage: 0 },
        corners: { /* ... */ },
        edges: { /* ... */ },
        surface: { frontDefects: [], backDefects: [], overallCondition: 'excellent' },
        printQuality: { hasFactoryDefects: false, defectTypes: [], severity: 'none' }
      },
      metadata: {
        confidence,
        modelVersion: 'mvp-v1.0.0',
        processingTimeMs: processingTime,
        imageQuality: {
          front: await this.assessImageQuality(frontBuffer),
          back: await this.assessImageQuality(backBuffer)
        },
        warnings: []
      }
    };
  }

  private argmax(array: number[]): number {
    return array.indexOf(Math.max(...array));
  }

  private getGradeLabel(grade: number): string {
    const labels: Record<number, string> = {
      10: 'Gem Mint (GM 10)',
      9: 'Mint (MT 9)',
      8: 'Near Mint / Mint (NM-MT 8)',
      7: 'Near Mint (NM 7)',
      6: 'Excellent (EX 6)',
      5: 'Very Good (VG 5)',
      4: 'Good (G 4)',
      3: 'Poor (P 3)',
      2: 'Fair (F 2)',
      1: 'Poor (PR 1)'
    };
    return labels[grade] || 'Unknown';
  }

  private async assessImageQuality(buffer: Buffer): Promise<any> {
    const metadata = await sharp(buffer).metadata();
    return {
      resolution: [metadata.width, metadata.height],
      blurScore: 0.9,  // TODO: Implémenter détection flou
      lightingScore: 0.85,
      isValid: true
    };
  }
}
```

**Controller** (`apps/api/src/grading/grading.controller.ts`):
```typescript
import { Controller, Post, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MLService } from '../ml/ml.service';

@Controller('api/grading')
export class GradingController {
  constructor(private readonly mlService: MLService) {}

  @Post('analyze')
  @UseInterceptors(FilesInterceptor('images', 2))
  async analyzeCard(@UploadedFiles() files: Express.Multer.File[]) {
    if (files.length !== 2) {
      throw new Error('Expected 2 images (front and back)');
    }

    const [front, back] = files;

    const result = await this.mlService.gradeCard(
      front.buffer,
      back.buffer
    );

    return result;
  }
}
```

### 6.3 Optimisations Performance

**1. Model caching**:
```typescript
// Charger le modèle une seule fois au démarrage (OnModuleInit)
// Éviter de recharger à chaque requête
```

**2. Batch inference** (si plusieurs cartes en même temps):
```typescript
async gradeMultipleCards(cards: CardImages[]): Promise<GradingResult[]> {
  // Stack tous les tensors
  const frontTensors = await Promise.all(
    cards.map(c => this.preprocessImage(c.front))
  );
  const backTensors = await Promise.all(
    cards.map(c => this.preprocessImage(c.back))
  );

  const frontBatch = tf.concat(frontTensors);
  const backBatch = tf.concat(backTensors);

  // Single inference call
  const predictions = await this.model.predictAsync({
    front_image: frontBatch,
    back_image: backBatch
  });

  // ...
}
```

**3. WebWorker isolation** (optionnel):
```typescript
// Exécuter TensorFlow dans un worker séparé pour ne pas bloquer event loop
// Utiliser worker_threads de Node.js
```

---

## 7. Testing & Evaluation

### 7.1 Métriques d'évaluation

**Script evaluation** (`packages/ml/scripts/evaluate.py`):
```python
import numpy as np
import tensorflow as tf
from sklearn.metrics import confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns

def evaluate_model(
    model: tf.keras.Model,
    test_dataset: tf.data.Dataset
) -> dict:
    """
    Évalue le modèle sur le test set.

    Métriques:
        - Accuracy globale par critère
        - Top-2 accuracy (acceptable si off by 1)
        - Exact match rate (tous les scores corrects)
        - Mean Absolute Error (MAE)
        - Confusion matrices
    """

    results = {
        'centering': {'predictions': [], 'true': []},
        'corners': {'predictions': [], 'true': []},
        'edges': {'predictions': [], 'true': []},
        'surface': {'predictions': [], 'true': []},
        'print_quality': {'predictions': [], 'true': []}
    }

    for batch in test_dataset:
        images, labels = batch
        predictions = model.predict(images)

        for criterion in results.keys():
            pred_classes = np.argmax(predictions[criterion], axis=-1) + 1  # 1-10
            true_classes = np.argmax(labels[criterion], axis=-1) + 1

            results[criterion]['predictions'].extend(pred_classes)
            results[criterion]['true'].extend(true_classes)

    # Calcul métriques
    metrics = {}
    for criterion, data in results.items():
        y_true = np.array(data['true'])
        y_pred = np.array(data['predictions'])

        # Accuracy
        accuracy = np.mean(y_true == y_pred)

        # Top-2 accuracy (acceptable si erreur de ±1)
        top2_accuracy = np.mean(np.abs(y_true - y_pred) <= 1)

        # MAE
        mae = np.mean(np.abs(y_true - y_pred))

        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred, labels=range(1, 11))

        metrics[criterion] = {
            'accuracy': accuracy,
            'top2_accuracy': top2_accuracy,
            'mae': mae,
            'confusion_matrix': cm
        }

        # Plot confusion matrix
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=range(1, 11), yticklabels=range(1, 11))
        plt.title(f'{criterion.capitalize()} - Confusion Matrix')
        plt.ylabel('True Grade')
        plt.xlabel('Predicted Grade')
        plt.savefig(f'packages/ml/evaluation/{criterion}_cm.png')
        plt.close()

    # Overall metrics
    all_true = []
    all_pred = []
    for criterion in results.keys():
        all_true.extend(results[criterion]['true'])
        all_pred.extend(results[criterion]['predictions'])

    overall_accuracy = np.mean(np.array(all_true) == np.array(all_pred))
    overall_mae = np.mean(np.abs(np.array(all_true) - np.array(all_pred)))

    print("\n=== Evaluation Results ===")
    for criterion, m in metrics.items():
        print(f"\n{criterion.upper()}:")
        print(f"  Accuracy: {m['accuracy']:.3f}")
        print(f"  Top-2 Accuracy: {m['top2_accuracy']:.3f}")
        print(f"  MAE: {m['mae']:.3f}")

    print(f"\nOVERALL:")
    print(f"  Accuracy: {overall_accuracy:.3f}")
    print(f"  MAE: {overall_mae:.3f}")

    return metrics
```

### 7.2 Tests unitaires

**Preprocessing tests** (`packages/ml/tests/test_preprocessing.py`):
```python
import pytest
import numpy as np
from ml.preprocessing import detect_card, normalize_card_image

def test_card_detection():
    # Load test image
    image = np.random.randint(0, 255, (1000, 800, 3), dtype=np.uint8)

    cropped, metadata = detect_card(image)

    assert cropped is not None
    assert 'corners' in metadata
    assert len(metadata['corners']) == 4
    assert 'confidence' in metadata
    assert 0 <= metadata['confidence'] <= 1

def test_normalize_card_image():
    card = np.random.randint(0, 255, (500, 350, 3), dtype=np.uint8)

    normalized = normalize_card_image(card)

    assert normalized.shape == (224, 224, 3)
    assert normalized.min() >= 0
    assert normalized.max() <= 1
```

**Model tests** (`packages/ml/tests/test_model.py`):
```python
import tensorflow as tf
from ml.training.models import build_mvp_model

def test_model_architecture():
    model = build_mvp_model()

    assert len(model.inputs) == 2
    assert len(model.outputs) == 6  # 5 criteria + confidence

    # Test forward pass
    dummy_front = tf.zeros((1, 224, 224, 3))
    dummy_back = tf.zeros((1, 224, 224, 3))

    outputs = model([dummy_front, dummy_back])

    assert 'centering' in outputs
    assert outputs['centering'].shape == (1, 10)
    assert outputs['confidence'].shape == (1, 1)

def test_model_output_ranges():
    model = build_mvp_model()

    dummy_front = tf.random.normal((1, 224, 224, 3))
    dummy_back = tf.random.normal((1, 224, 224, 3))

    outputs = model([dummy_front, dummy_back])

    # Softmax outputs should sum to 1
    for criterion in ['centering', 'corners', 'edges', 'surface', 'print_quality']:
        output_sum = tf.reduce_sum(outputs[criterion], axis=-1)
        assert tf.abs(output_sum - 1.0).numpy() < 1e-5

    # Confidence should be in [0, 1]
    assert 0 <= outputs['confidence'].numpy()[0][0] <= 1
```

---

## 8. Structure Finale du Package ML

```
packages/ml/
├── README.md                       # Documentation
├── requirements.txt                # Dépendances Python
├── setup.py                        # Package setup
│
├── configs/                        # Configurations YAML
│   ├── mvp_training.yaml
│   ├── production_training.yaml
│   └── inference.yaml
│
├── datasets/                       # Données d'entraînement
│   ├── train/
│   │   └── cards/
│   │       ├── card_001/
│   │       │   ├── front.jpg
│   │       │   ├── back.jpg
│   │       │   └── labels.json
│   │       └── ...
│   ├── val/
│   └── test/
│
├── models/                         # Modèles exportés
│   ├── tfjs/
│   │   ├── mvp-v1/
│   │   │   ├── model.json
│   │   │   └── group*.bin
│   │   └── production-v2/
│   └── keras/
│       ├── best_model.h5
│       └── checkpoints/
│
├── preprocessing/                  # Utilitaires preprocessing
│   ├── __init__.py
│   ├── card_detection.py          # Détection contours
│   ├── normalization.py           # Resize + normalize
│   ├── quality_check.py           # Blur/lighting detection
│   └── augmentation.py            # Data augmentation
│
├── training/                       # Scripts training
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── mvp_model.py           # Architecture MVP
│   │   └── advanced_model.py      # Architecture avancée
│   ├── losses.py                  # Custom losses
│   ├── callbacks.py               # Custom callbacks
│   ├── dataset.py                 # Dataset loaders
│   └── train.py                   # Script principal training
│
├── inference/                      # Scripts inférence standalone
│   ├── __init__.py
│   ├── predict.py                 # CLI pour tester modèle
│   └── batch_predict.py           # Batch inference
│
├── evaluation/                     # Évaluation modèles
│   ├── evaluate.py                # Script evaluation
│   ├── metrics.py                 # Métriques custom
│   └── visualize.py               # Visualisations résultats
│
├── scripts/                        # Scripts utilitaires
│   ├── export_tfjs.py             # Export vers TensorFlow.js
│   ├── convert_dataset.py         # Conversion formats
│   └── download_pretrained.py     # Download weights
│
├── notebooks/                      # Jupyter notebooks exploration
│   ├── 01_data_exploration.ipynb
│   ├── 02_model_prototyping.ipynb
│   └── 03_error_analysis.ipynb
│
├── tests/                          # Tests unitaires
│   ├── __init__.py
│   ├── test_preprocessing.py
│   ├── test_model.py
│   └── test_inference.py
│
├── annotation-tool/                # Tool annotation web
│   ├── index.html
│   ├── annotate.js
│   └── viewer.css
│
└── utils/                          # Utilitaires généraux
    ├── __init__.py
    ├── logging.py
    └── file_io.py
```

---

## 9. Checklist d'Implémentation

### Phase 1 - Setup Infrastructure (Semaine 1)

- [ ] Créer structure `packages/ml/` avec tous les dossiers
- [ ] Installer dépendances Python (`requirements.txt`)
  ```
  tensorflow>=2.15.0
  tensorflow-hub
  tensorflowjs>=4.0.0
  opencv-python
  numpy
  pandas
  pyyaml
  scikit-learn
  matplotlib
  seaborn
  jupyter
  pillow
  ```
- [ ] Configurer environnement virtuel Python
- [ ] Créer configs YAML (training, inference)
- [ ] Setup logging et structure projet

### Phase 2 - Preprocessing Pipeline (Semaine 1-2)

- [ ] Implémenter `card_detection.py` (détection contours)
- [ ] Implémenter `normalization.py` (resize, normalize)
- [ ] Implémenter `quality_check.py` (blur, lighting)
- [ ] Implémenter `augmentation.py` (data augmentation)
- [ ] Tests unitaires preprocessing
- [ ] Script test end-to-end sur images exemple

### Phase 3 - Dataset Création (Semaine 2-3)

- [ ] Décider source données (acheter cartes vs scraping)
- [ ] Créer annotation tool web
- [ ] Annoter 100 cartes pour prototype
- [ ] Créer script `dataset.py` pour loading
- [ ] Valider format labels.json
- [ ] Splitter train/val/test (70/15/15)

### Phase 4 - Modèle MVP (Semaine 3-4)

- [ ] Implémenter `mvp_model.py` (architecture multi-head)
- [ ] Implémenter custom loss function
- [ ] Implémenter script `train.py`
- [ ] Configurer callbacks (checkpoint, early stopping, TensorBoard)
- [ ] Lancer premier training (même avec peu de données)
- [ ] Analyser résultats TensorBoard
- [ ] Ajuster hyperparamètres

### Phase 5 - Evaluation (Semaine 4)

- [ ] Implémenter `evaluate.py`
- [ ] Calculer métriques sur test set
- [ ] Générer confusion matrices
- [ ] Analyser erreurs (error analysis)
- [ ] Documenter performances MVP

### Phase 6 - Export & Déploiement (Semaine 5)

- [ ] Implémenter `export_tfjs.py`
- [ ] Tester export avec quantization
- [ ] Vérifier taille modèle final (< 100MB)
- [ ] Intégrer dans NestJS (`MLService`)
- [ ] Tester endpoint API `/api/grading/analyze`
- [ ] Mesurer temps inférence (< 2s)

### Phase 7 - Inference & Tests (Semaine 5)

- [ ] Créer script `predict.py` (CLI standalone)
- [ ] Tester sur nouvelles cartes jamais vues
- [ ] Comparer prédictions vs grades réels (si disponibles)
- [ ] Ajuster confidence threshold
- [ ] Documenter cas d'usage et limitations

### Phase 8 - Itération (Semaine 6+)

- [ ] Annoter 400+ cartes supplémentaires
- [ ] Re-entraîner avec dataset complet
- [ ] Implémenter détails avancés (corners, edges analysis)
- [ ] Ajouter visualisations (heatmaps défauts)
- [ ] Optimiser modèle (pruning, distillation)
- [ ] A/B testing avec utilisateurs beta

---

## 10. Limitations & Améliorations Futures

### Limitations MVP

1. **Subjectivité**: Le grading PCA/PSA a une part d'interprétation humaine. Le modèle ne sera jamais 100% aligné.
2. **Dataset limité**: Avec < 1000 cartes, le modèle peut overfitter ou manquer de généralisation.
3. **Diversité cartes**: Le modèle pourrait être biaisé vers Pokémon si majoritaire dans dataset.
4. **Détails incomplets**: MVP ne fait pas d'analyse détaillée corners/edges individuellement.
5. **Confidence**: Calibration confidence difficile sans beaucoup de données.

### Améliorations Phase 2

**Architecture avancée**:
- Attention mechanisms pour focus sur coins/arêtes
- Feature Pyramid Network (FPN) pour multi-scale detection
- Siamese network pour comparer front/back consistency

**Analyse détaillée**:
- Détection automatique coins (keypoint detection)
- Segmentation défauts (U-Net ou Mask R-CNN)
- Mesure automatique centrage (edge detection + calcul ratio)
- Texture analysis avec filtres Gabor

**Dataset**:
- Crowdsourcing annotations (Reddit, Discord communities)
- Synthetic data generation avec GAN
- Active learning (annoter exemples où modèle incertain)
- Multi-langue, multi-types (Sports, Magic, Yu-Gi-Oh)

**Déploiement**:
- TensorFlow Lite pour mobile (on-device inference)
- ONNX export pour compatibilité autres frameworks
- Quantization int8 pour edge devices
- Model ensemble (combiner plusieurs modèles)

**Explainability**:
- Grad-CAM pour visualiser zones importantes
- SHAP values pour expliquer prédictions
- Confidence calibration (Platt scaling)

---

## 11. Ressources & Références

### Documentation TensorFlow
- [TensorFlow Guide](https://www.tensorflow.org/guide)
- [Keras API](https://keras.io/api/)
- [TensorFlow.js Node](https://www.tensorflow.org/js/guide/nodejs)
- [Transfer Learning Tutorial](https://www.tensorflow.org/tutorials/images/transfer_learning)

### Grading Standards
- [PSA Grading Standards](https://www.psacard.com/resources/gradingstandards)
- [PCA Grading Guide](https://www.pcagrade.com/grading)
- Reddit r/PokemonTCG discussions on grading
- YouTube: "How to Grade Your Own Cards" tutorials

### Computer Vision
- [OpenCV Python Tutorials](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [Image Segmentation](https://www.tensorflow.org/tutorials/images/segmentation)
- [Object Detection](https://www.tensorflow.org/lite/examples/object_detection/overview)

### Papers
- EfficientNetV2: "EfficientNetV2: Smaller Models and Faster Training" (2021)
- Multi-task Learning: "An Overview of Multi-Task Learning in Deep Neural Networks" (2017)
- Quality Assessment: "No-Reference Image Quality Assessment in the Spatial Domain" (2012)

---

## Conclusion

Ce plan propose une approche **pragmatique et incrémentale** pour le modèle ML de card grading :

1. **MVP rapide** (4-5 semaines) avec transfer learning
2. **Dataset réaliste** (500-1000 cartes annotées pour commencer)
3. **Architecture multi-head** adaptée aux 5 critères PCA
4. **Intégration NestJS** via TensorFlow.js
5. **Pipeline complet** preprocessing → training → evaluation → deployment

**Prochaines étapes** :
- Valider l'approche avec le product owner
- Décider de la stratégie dataset (acheter cartes vs scraping)
- Lancer Phase 1 (setup infrastructure)
- Paralléliser annotation + développement preprocessing

Le modèle ne sera pas parfait dès le MVP, mais il fournira une **baseline fonctionnelle** qui pourra être améliorée itérativement avec plus de données et feedback utilisateurs.

---

**Plan rédigé par**: tensorflow-ml-agent
**Pour**: Agent principal (implémentation)
**Date**: 2026-01-10
