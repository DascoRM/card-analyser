# Card Grading ML Service

> Service d'analyse d'images de cartes a collectionner utilisant TensorFlow pour fournir des grades PCA/PSA.

## Responsabilites

- Reception des requetes d'analyse depuis l'API NestJS
- Preprocessing des images (resize, normalisation)
- Inference via modele TensorFlow
- Retour des scores pour les 5 criteres de notation

## Stack Technique

| Technologie | Usage |
|-------------|-------|
| Python 3.10+ | Runtime |
| FastAPI | Framework API |
| TensorFlow | Inference ML |
| OpenCV | Traitement d'images |
| Pillow | Manipulation d'images |
| Pydantic | Validation des donnees |

## Installation

### Prerequis

- Python >= 3.10
- pip ou pipenv

### Setup

```bash
# Se placer dans le dossier
cd packages/ml

# Creer un environnement virtuel
python -m venv venv

# Activer l'environnement
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Installer les dependances
pip install -r requirements.txt

# Copier le fichier d'environnement
cp .env.example .env
# Editer .env avec vos valeurs
```

## Configuration

### Variables d'environnement (.env)

| Variable | Description | Defaut |
|----------|-------------|--------|
| `ML_HOST` | Adresse d'ecoute | `0.0.0.0` |
| `ML_PORT` | Port du serveur | `5000` |
| `ML_DEBUG` | Mode debug (hot reload) | `true` |
| `ML_API_KEY` | Cle API pour l'authentification | `dev-api-key` |
| `ML_MODEL_PATH` | Chemin vers le modele | `models/tfjs/mvp-v1` |
| `ML_USE_GPU` | Utiliser le GPU si disponible | `false` |
| `ML_UPLOADS_PATH` | Chemin vers le dossier uploads de l'API | `../apps/api/uploads` |

## Demarrage

```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Lancer le service
python main.py
```

Le service sera disponible sur `http://localhost:5000`

Documentation Swagger: [http://localhost:5000/docs](http://localhost:5000/docs)

## Endpoints API

### POST /analyze

Analyse une paire d'images (recto/verso) et retourne les scores.

**Headers**:
- `X-API-Key`: Cle API (obligatoire)

**Body**:
```json
{
  "front_image": "/uploads/sessions/front-xyz.jpg",
  "back_image": "/uploads/sessions/back-xyz.jpg",
  "session_id": "uuid-session"
}
```

**Response**:
```json
{
  "centering": 9.2,
  "corners": 8.5,
  "edges": 8.8,
  "surface": 9.0,
  "printQuality": 8.7,
  "confidence": 0.92,
  "modelVersion": "mvp-v1",
  "rawData": {}
}
```

### GET /health

Verification de sante du service.

**Response**:
```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "1.0.0",
  "timestamp": 1704825600.123
}
```

### GET /model/info

Informations sur le modele charge.

**Headers**:
- `X-API-Key`: Cle API (obligatoire)

**Response**:
```json
{
  "version": "mvp-v1",
  "lastUpdated": "2026-01-10",
  "inputShape": [224, 224, 3],
  "outputClasses": 10
}
```

## Structure du Code

```
packages/ml/
├── main.py              # Application FastAPI
├── requirements.txt     # Dependances Python
├── .env                 # Variables d'environnement
├── configs/             # Fichiers de configuration
├── datasets/            # Donnees d'entrainement (vide - MVP)
├── inference/
│   ├── __init__.py
│   └── grader.py        # Classe CardGrader (analyse)
├── models/
│   └── tfjs/            # Modeles TensorFlow
│       └── mvp-v1/      # Version MVP
├── preprocessing/
│   ├── __init__.py
│   └── image_processor.py  # Traitement d'images
├── training/            # Scripts d'entrainement (futur)
├── scripts/             # Scripts utilitaires
└── tests/               # Tests unitaires
```

## Criteres de Notation

Le service analyse 5 criteres (notes de 1 a 10):

| Critere | Description | Analyse |
|---------|-------------|---------|
| `centering` | Centrage de l'image | Detection des bords, mesure des marges |
| `corners` | Etat des coins | Detection d'usure, plis, dommages |
| `edges` | Etat des bords | Detection de blanchiment, entailles |
| `surface` | Etat de la surface | Rayures, taches, defauts |
| `printQuality` | Qualite d'impression | Nettete, saturation, defauts |

## Authentification

Le service utilise une authentification par API Key.

```bash
# Exemple curl
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "front_image": "/uploads/sessions/front.jpg",
    "back_image": "/uploads/sessions/back.jpg",
    "session_id": "uuid"
  }'
```

## Mode MVP (Mock)

Pour le MVP, le modele retourne des valeurs simulees basees sur une analyse basique de l'image:

1. Verifie que les images existent
2. Verifie les dimensions et le format
3. Effectue une analyse de base (histogramme, detection de bords)
4. Retourne des scores representatifs

Ce mode permet de valider l'integration complete avant d'entrainer un vrai modele.

## Tests

```bash
# Lancer les tests
pytest tests/

# Avec couverture
pytest tests/ --cov=.
```

## Developpement

### Ajouter une dependance

```bash
pip install package-name
pip freeze > requirements.txt
```

### Format du code

```bash
# Formater avec black
black .

# Verifier avec flake8
flake8 .
```

## Entrainement du Modele (Futur)

Le dossier `training/` contiendra les scripts pour:

1. **Preparation des donnees**: Annotation, augmentation
2. **Entrainement**: Fine-tuning d'un modele pre-entraine
3. **Evaluation**: Metriques, matrices de confusion
4. **Export**: Conversion vers TensorFlow.js

## Liens

- [Documentation Architecture](../../docs/architecture/overview.md)
- [API NestJS](../../apps/api/README.md)
- [Guide d'installation](../../docs/getting-started/installation.md)
