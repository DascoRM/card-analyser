# Specification du Format des Donnees

Ce document decrit les formats de donnees utilises pour l'entrainement du modele ML et l'inference.

## Images

### Specifications Techniques

| Propriete | Valeur Recommandee | Minimum |
|-----------|-------------------|---------|
| Format | JPEG, PNG | JPEG |
| Resolution | 1500x2100 px | 500x700 px |
| Ratio | ~1:1.4 (format carte) | - |
| Profondeur | 24-bit (RGB) | 24-bit |
| Taille max | 10 MB | - |
| Compression JPEG | 90%+ qualite | 80% |

### Nomenclature des Fichiers

```
{card_id}_{side}.{extension}

Exemples:
- card_001_front.jpg
- card_001_back.jpg
- charizard_base_001_front.png
```

### Criteres de Qualite

#### Images Acceptees

- Carte centree dans l'image
- Eclairage uniforme sans reflets
- Mise au point nette
- Fond neutre (prefere: noir, blanc, gris)
- Orientation correcte (portrait)

#### Images Rejetees

- Floues ou mal focalisees
- Avec reflets ou ombres marquees
- Carte coupee ou partiellement visible
- Mauvaise exposition (trop sombre/claire)
- Presence d'objets parasites

### Exemple de Structure

```
datasets/
├── raw/                    # Images brutes non traitees
│   ├── batch_2026_01/
│   │   ├── IMG_001.jpg
│   │   └── IMG_002.jpg
│   └── batch_2026_02/
│       └── ...
├── processed/              # Images preprocessees
│   ├── train/
│   │   ├── card_001_front.jpg
│   │   └── card_001_back.jpg
│   ├── val/
│   │   └── ...
│   └── test/
│       └── ...
└── augmented/             # Images augmentees (generees)
    └── ...
```

## Labels (Annotations)

### Format CSV

Fichier principal: `labels.csv`

```csv
image_id,centering,corners,edges,surface,print_quality,annotator,date
card_001_front,9.5,8.0,8.5,9.0,9.0,expert_1,2026-01-10
card_001_back,9.5,8.0,8.5,9.0,9.0,expert_1,2026-01-10
card_002_front,7.0,6.5,7.0,8.0,7.5,expert_2,2026-01-10
```

### Colonnes

| Colonne | Type | Description | Valeurs |
|---------|------|-------------|---------|
| `image_id` | string | Identifiant unique de l'image | `{card_id}_{side}` |
| `centering` | float | Score de centrage | 1.0 - 10.0 |
| `corners` | float | Score des coins | 1.0 - 10.0 |
| `edges` | float | Score des bords | 1.0 - 10.0 |
| `surface` | float | Score de la surface | 1.0 - 10.0 |
| `print_quality` | float | Score qualite d'impression | 1.0 - 10.0 |
| `annotator` | string | ID de l'annotateur | optionnel |
| `date` | date | Date d'annotation | YYYY-MM-DD |

### Criteres de Notation Detailles

#### Centering (Centrage)

Mesure la symetrie des marges autour de l'image de la carte.

| Score | Description |
|-------|-------------|
| 10 | Parfaitement centre (< 1% deviation) |
| 9 | Tres bien centre (1-3% deviation) |
| 8 | Bien centre (3-5% deviation) |
| 7 | Legerement decentre (5-7% deviation) |
| 6 | Decentre visible (7-10% deviation) |
| 5 | Decentre marque (10-15% deviation) |
| 4-1 | Fortement decentre (> 15% deviation) |

#### Corners (Coins)

Evalue l'etat des 4 coins de la carte.

| Score | Description |
|-------|-------------|
| 10 | Coins parfaits, pointes nettes |
| 9 | Usure microscopique, invisible a l'oeil nu |
| 8 | Legere usure visible a la loupe |
| 7 | Usure visible, coins legerement arrondis |
| 6 | Coins arrondis, blanchiment leger |
| 5 | Usure marquee sur plusieurs coins |
| 4-1 | Coins endommages, plies, ou manquants |

#### Edges (Bords)

Evalue l'etat des 4 bords de la carte.

| Score | Description |
|-------|-------------|
| 10 | Bords parfaits, pas de defauts |
| 9 | Usure microscopique |
| 8 | Legere usure ou blanchiment localise |
| 7 | Blanchiment visible sur certains bords |
| 6 | Entailles ou usure sur plusieurs bords |
| 5 | Blanchiment marque |
| 4-1 | Bords endommages, dechires |

#### Surface

Evalue l'etat de la surface de la carte.

| Score | Description |
|-------|-------------|
| 10 | Surface parfaite, pas de defauts |
| 9 | Micro-rayures invisibles a l'oeil nu |
| 8 | Legeres rayures visibles a la lumiere |
| 7 | Rayures ou taches legeres |
| 6 | Rayures visibles, marques legeres |
| 5 | Plusieurs defauts de surface |
| 4-1 | Surface endommagee, pliures, taches |

#### Print Quality (Qualite d'Impression)

Evalue la qualite de l'impression d'origine.

| Score | Description |
|-------|-------------|
| 10 | Impression parfaite, couleurs vives |
| 9 | Excellente qualite, defauts microscopiques |
| 8 | Tres bonne qualite, leger defaut d'encrage |
| 7 | Bonne qualite, defauts mineurs visibles |
| 6 | Defauts d'impression notables |
| 5 | Problemes de registre ou d'encrage |
| 4-1 | Defauts d'impression majeurs |

## Format JSON (Alternatif)

Pour des annotations plus riches:

```json
{
  "version": "1.0",
  "cards": [
    {
      "card_id": "card_001",
      "metadata": {
        "name": "Charizard",
        "set": "Base Set",
        "year": 1999,
        "type": "Pokemon"
      },
      "images": {
        "front": {
          "path": "images/card_001_front.jpg",
          "width": 1500,
          "height": 2100
        },
        "back": {
          "path": "images/card_001_back.jpg",
          "width": 1500,
          "height": 2100
        }
      },
      "grades": {
        "centering": {
          "score": 9.5,
          "notes": "Leger decentrage horizontal"
        },
        "corners": {
          "score": 8.0,
          "notes": "Coin superieur droit legerement use"
        },
        "edges": {
          "score": 8.5,
          "notes": ""
        },
        "surface": {
          "score": 9.0,
          "notes": ""
        },
        "print_quality": {
          "score": 9.0,
          "notes": ""
        }
      },
      "final_grade": 8.0,
      "annotator": "expert_1",
      "date": "2026-01-10",
      "confidence": "high"
    }
  ]
}
```

## Validation des Donnees

### Script de Validation

```python
import pandas as pd
from pathlib import Path

def validate_dataset(labels_path, images_dir):
    """Valider la coherence du dataset."""
    errors = []

    # Charger les labels
    df = pd.read_csv(labels_path)

    # Verifier les colonnes requises
    required_cols = ['image_id', 'centering', 'corners', 'edges', 'surface', 'print_quality']
    for col in required_cols:
        if col not in df.columns:
            errors.append(f"Colonne manquante: {col}")

    # Verifier les scores
    score_cols = ['centering', 'corners', 'edges', 'surface', 'print_quality']
    for col in score_cols:
        invalid = df[(df[col] < 1) | (df[col] > 10)]
        if len(invalid) > 0:
            errors.append(f"Scores invalides dans {col}: {len(invalid)} lignes")

    # Verifier les images
    images_dir = Path(images_dir)
    for image_id in df['image_id']:
        extensions = ['.jpg', '.jpeg', '.png']
        found = False
        for ext in extensions:
            if (images_dir / f"{image_id}{ext}").exists():
                found = True
                break
        if not found:
            errors.append(f"Image manquante: {image_id}")

    return errors

# Usage
errors = validate_dataset('labels.csv', 'images/')
if errors:
    for e in errors:
        print(f"ERROR: {e}")
else:
    print("Dataset valide!")
```

## Splits Train/Val/Test

### Repartition Recommandee

| Split | Pourcentage | Usage |
|-------|-------------|-------|
| Train | 70% | Entrainement |
| Validation | 15% | Hyperparametres |
| Test | 15% | Evaluation finale |

### Script de Split

```python
from sklearn.model_selection import train_test_split
import shutil

def split_dataset(labels_path, output_dir, random_state=42):
    """Diviser le dataset en train/val/test."""
    df = pd.read_csv(labels_path)

    # Obtenir les card_ids uniques (grouper front/back)
    card_ids = df['image_id'].apply(lambda x: x.rsplit('_', 1)[0]).unique()

    # Split
    train_ids, temp_ids = train_test_split(card_ids, test_size=0.3, random_state=random_state)
    val_ids, test_ids = train_test_split(temp_ids, test_size=0.5, random_state=random_state)

    # Creer les sous-datasets
    for split_name, split_ids in [('train', train_ids), ('val', val_ids), ('test', test_ids)]:
        split_df = df[df['image_id'].apply(lambda x: x.rsplit('_', 1)[0]).isin(split_ids)]
        split_df.to_csv(f"{output_dir}/{split_name}/labels.csv", index=False)
        print(f"{split_name}: {len(split_df)} images")
```

## Augmentation des Donnees

### Transformations Supportees

| Transformation | Parametres | Usage |
|----------------|------------|-------|
| Horizontal Flip | - | Oui |
| Rotation | ±5° | Oui |
| Zoom | 0.9-1.1 | Oui |
| Brightness | ±10% | Oui |
| Contrast | ±10% | Oui |
| Vertical Flip | - | Non (carte orientee) |
| Crop | - | Non (perte d'info) |

### Ratio d'Augmentation

- **Train**: 3-5x augmentation
- **Val/Test**: Pas d'augmentation

## Liens

- [Guide d'entrainement](model-training.md)
- [Service ML](../../packages/ml/README.md)
