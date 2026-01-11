# Plan de correction des dépendances Python - ML Service

## Analyse du problème

**Symptôme**: `ModuleNotFoundError: No module named 'uvicorn'`

**Cause identifiée**: Le virtualenv Python (`packages/ml/venv/`) existe mais est vide. Aucun package n'est installé.

**Vérifications effectuées**:
- ✅ `requirements.txt` contient bien `uvicorn[standard]>=0.27.0` et toutes les dépendances nécessaires
- ✅ Le virtualenv existe (`packages/ml/venv/`)
- ❌ Aucun package installé dans le venv (`pip freeze` retourne vide)

## Dépendances listées dans requirements.txt

Le fichier est correctement structuré avec:
- TensorFlow 2.15+ et tensorflowjs
- FastAPI et uvicorn (avec extras `[standard]`)
- OpenCV, Pillow, NumPy pour le traitement d'images
- PyYAML, python-dotenv pour la config
- pytest et httpx pour les tests

**Aucune modification nécessaire au fichier requirements.txt.**

## Actions de correction

### 1. Réinstaller toutes les dépendances

```bash
cd packages/ml
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Vérifier l'installation

```bash
pip list | grep -E "(uvicorn|fastapi|tensorflow)"
```

Doit afficher:
- `fastapi`
- `uvicorn`
- `tensorflow`

### 3. Tester le démarrage du service

```bash
python main.py
```

Le serveur devrait démarrer sur `http://0.0.0.0:5000`

## Notes

- Le venv Python 3.13 est correctement configuré
- Pas de problème de compatibilité détecté
- C'est simplement une installation manquante, pas un problème de configuration

## Temps estimé

5 minutes (temps d'installation des packages)
