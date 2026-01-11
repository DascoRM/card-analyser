# Guide d'Entrainement du Modele ML

Ce guide decrit le processus d'entrainement du modele de grading de cartes.

## Vue d'Ensemble

Le modele analyse les images de cartes a collectionner et predit des scores pour 5 criteres:

1. **Centering** - Centrage de l'image sur la carte
2. **Corners** - Etat des coins
3. **Edges** - Etat des bords
4. **Surface** - Etat de la surface
5. **Print Quality** - Qualite d'impression

## Architecture du Modele

### Approche Recommandee

**Transfer Learning** avec un modele pre-entraine (EfficientNet, ResNet, ou MobileNet):

```
┌─────────────────────────────────────────┐
│           Input: 224x224x3              │
├─────────────────────────────────────────┤
│     Pre-trained Backbone (frozen)       │
│     (EfficientNetB0 / ResNet50)         │
├─────────────────────────────────────────┤
│         Global Average Pooling          │
├─────────────────────────────────────────┤
│           Dense(512, ReLU)              │
│              Dropout(0.3)               │
├─────────────────────────────────────────┤
│           Dense(256, ReLU)              │
│              Dropout(0.3)               │
├─────────────────────────────────────────┤
│      Output: 5 scores (sigmoid * 10)    │
│   [centering, corners, edges,           │
│    surface, printQuality]               │
└─────────────────────────────────────────┘
```

### Pourquoi Transfer Learning?

- Dataset limite au depart
- Convergence plus rapide
- Meilleure generalisation
- Moins de ressources necessaires

## Preparation des Donnees

### Structure du Dataset

```
datasets/
├── train/
│   ├── images/
│   │   ├── card_001_front.jpg
│   │   ├── card_001_back.jpg
│   │   ├── card_002_front.jpg
│   │   └── ...
│   └── labels.csv
├── val/
│   ├── images/
│   │   └── ...
│   └── labels.csv
└── test/
    ├── images/
    │   └── ...
    └── labels.csv
```

### Format des Labels (labels.csv)

```csv
image_id,centering,corners,edges,surface,print_quality
card_001_front,9.5,8.0,8.5,9.0,9.0
card_001_back,9.5,8.0,8.5,9.0,9.0
card_002_front,7.0,6.5,7.0,8.0,7.5
...
```

Voir [data-format.md](data-format.md) pour les specifications detaillees.

## Pipeline d'Entrainement

### 1. Preprocessing

```python
import tensorflow as tf

def preprocess_image(image_path, target_size=(224, 224)):
    """Pretraitement standard pour l'entrainement."""
    # Charger l'image
    image = tf.io.read_file(image_path)
    image = tf.image.decode_jpeg(image, channels=3)

    # Resize
    image = tf.image.resize(image, target_size)

    # Normalisation (ImageNet stats)
    image = tf.keras.applications.efficientnet.preprocess_input(image)

    return image
```

### 2. Data Augmentation

```python
data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.05),
    tf.keras.layers.RandomZoom(0.1),
    tf.keras.layers.RandomBrightness(0.1),
    tf.keras.layers.RandomContrast(0.1),
])
```

**Important**: Ne pas utiliser de flip vertical (les cartes ont une orientation).

### 3. Construction du Modele

```python
def build_model(input_shape=(224, 224, 3), num_outputs=5):
    """Construire le modele de grading."""

    # Backbone pre-entraine
    base_model = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights='imagenet',
        input_shape=input_shape
    )

    # Geler les poids du backbone
    base_model.trainable = False

    # Construire le modele
    inputs = tf.keras.Input(shape=input_shape)
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(512, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(256, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.3)(x)

    # Output: 5 scores entre 0 et 10
    outputs = tf.keras.layers.Dense(num_outputs, activation='sigmoid')(x)
    outputs = outputs * 10  # Echelle 0-10

    model = tf.keras.Model(inputs, outputs)

    return model
```

### 4. Compilation

```python
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss='mse',  # Mean Squared Error pour la regression
    metrics=['mae']  # Mean Absolute Error
)
```

### 5. Callbacks

```python
callbacks = [
    # Early stopping
    tf.keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    ),

    # Reduce learning rate
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=5,
        min_lr=1e-6
    ),

    # Model checkpoint
    tf.keras.callbacks.ModelCheckpoint(
        'models/best_model.keras',
        monitor='val_loss',
        save_best_only=True
    ),

    # TensorBoard
    tf.keras.callbacks.TensorBoard(
        log_dir='logs/training'
    )
]
```

### 6. Entrainement

```python
# Phase 1: Entrainer les couches superieures
history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=50,
    callbacks=callbacks
)

# Phase 2: Fine-tuning (degeler une partie du backbone)
base_model.trainable = True
for layer in base_model.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='mse',
    metrics=['mae']
)

history_fine = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=30,
    callbacks=callbacks
)
```

## Evaluation

### Metriques

```python
def evaluate_model(model, test_dataset):
    """Evaluer le modele sur le jeu de test."""

    # Predictions
    y_true = []
    y_pred = []

    for images, labels in test_dataset:
        predictions = model.predict(images)
        y_true.extend(labels.numpy())
        y_pred.extend(predictions)

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # Metriques par critere
    criteria = ['centering', 'corners', 'edges', 'surface', 'printQuality']

    for i, criterion in enumerate(criteria):
        mae = np.mean(np.abs(y_true[:, i] - y_pred[:, i]))
        rmse = np.sqrt(np.mean((y_true[:, i] - y_pred[:, i])**2))
        print(f"{criterion}: MAE={mae:.2f}, RMSE={rmse:.2f}")

    # Accuracy a +/- 0.5 point
    accuracy = np.mean(np.abs(y_true - y_pred) <= 0.5)
    print(f"Accuracy (±0.5): {accuracy:.2%}")
```

### Objectifs de Performance

| Metrique | Objectif MVP | Objectif Production |
|----------|--------------|---------------------|
| MAE global | < 1.0 | < 0.5 |
| RMSE global | < 1.5 | < 0.7 |
| Accuracy (±0.5) | > 60% | > 80% |
| Accuracy (±1.0) | > 80% | > 95% |

## Export du Modele

### Format TensorFlow SavedModel

```python
# Sauvegarder
model.save('models/grading_model')

# Charger
model = tf.keras.models.load_model('models/grading_model')
```

### Format TensorFlow.js

```bash
# Installation
pip install tensorflowjs

# Conversion
tensorflowjs_converter \
    --input_format=keras \
    models/grading_model \
    models/tfjs/grading_model
```

### Format TensorFlow Lite (mobile)

```python
# Conversion
converter = tf.lite.TFLiteConverter.from_saved_model('models/grading_model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

# Sauvegarder
with open('models/grading_model.tflite', 'wb') as f:
    f.write(tflite_model)
```

## Bonnes Pratiques

### Dataset

1. **Diversite**: Inclure differents types de cartes (Pokemon, Sports, etc.)
2. **Qualite**: Annotations faites par des experts
3. **Equilibre**: Repartition uniforme des grades
4. **Taille minimale**: 1000+ images pour le MVP, 10000+ pour production

### Entrainement

1. **Validation croisee**: K-Fold pour petits datasets
2. **Regularisation**: Dropout, augmentation
3. **Monitoring**: TensorBoard pour suivre l'entrainement
4. **Reproductibilite**: Fixer les seeds aleatoires

### Production

1. **Versioning**: Versionner les modeles (v1, v2, ...)
2. **A/B Testing**: Comparer les performances en production
3. **Monitoring**: Suivre les predictions en production
4. **Retraining**: Pipeline de re-entrainement periodique

## Structure des Scripts

```
packages/ml/
├── training/
│   ├── train.py           # Script principal
│   ├── model.py           # Architecture du modele
│   ├── dataset.py         # Chargement des donnees
│   ├── augmentation.py    # Data augmentation
│   └── evaluate.py        # Evaluation
├── scripts/
│   ├── prepare_dataset.py # Preparation des donnees
│   ├── export_model.py    # Export vers differents formats
│   └── benchmark.py       # Benchmark de performance
└── configs/
    ├── training_config.yaml
    └── model_config.yaml
```

## Commandes

```bash
# Preparer le dataset
python scripts/prepare_dataset.py --input raw_data/ --output datasets/

# Entrainer le modele
python training/train.py --config configs/training_config.yaml

# Evaluer
python training/evaluate.py --model models/best_model --data datasets/test

# Exporter
python scripts/export_model.py --model models/best_model --format tfjs
```

## Ressources

- [TensorFlow Documentation](https://www.tensorflow.org/tutorials)
- [Transfer Learning Guide](https://www.tensorflow.org/tutorials/images/transfer_learning)
- [TensorFlow.js Conversion](https://www.tensorflow.org/js/tutorials/conversion/import_keras)
