# Tutoriel - Session de Grading Complete

Ce tutoriel vous guide a travers un workflow complet de grading de carte, de la creation de session jusqu'a l'obtention des resultats.

## Prerequis

- API NestJS en cours d'execution (`http://localhost:3000`)
- Service ML en cours d'execution (`http://localhost:5000`)
- Un utilisateur cree dans la base de donnees (userId: 1)
- Deux images de carte (recto et verso)

## Etape 1: Creer une Session

Commencez par creer une nouvelle session de grading.

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "cardName": "Charizard Holo",
    "cardSet": "Base Set",
    "cardYear": 1999,
    "cardType": "Pokemon"
  }'
```

**Reponse**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": 1,
  "cardName": "Charizard Holo",
  "cardSet": "Base Set",
  "cardYear": 1999,
  "cardType": "Pokemon",
  "status": "PENDING",
  "images": [],
  "gradeResults": [],
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-01-10T10:00:00.000Z",
  "completedAt": null
}
```

**Notez l'ID de la session** (`a1b2c3d4-e5f6-7890-abcd-ef1234567890`) pour les etapes suivantes.

## Etape 2: Uploader l'Image Recto (FRONT)

Uploadez l'image du recto de la carte.

```bash
SESSION_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

curl -X POST "http://localhost:3000/sessions/${SESSION_ID}/images?userId=1" \
  -F "image=@./charizard-front.jpg" \
  -F "side=FRONT"
```

**Reponse**:

```json
{
  "id": "img-front-uuid",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "side": "FRONT",
  "url": "/uploads/sessions/1704880800-front.jpg",
  "filename": "charizard-front.jpg",
  "mimeType": "image/jpeg",
  "size": 245678,
  "uploadedAt": "2026-01-10T10:01:00.000Z"
}
```

## Etape 3: Uploader l'Image Verso (BACK)

Uploadez l'image du verso de la carte.

```bash
curl -X POST "http://localhost:3000/sessions/${SESSION_ID}/images?userId=1" \
  -F "image=@./charizard-back.jpg" \
  -F "side=BACK"
```

**Reponse**:

```json
{
  "id": "img-back-uuid",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "side": "BACK",
  "url": "/uploads/sessions/1704880860-back.jpg",
  "filename": "charizard-back.jpg",
  "mimeType": "image/jpeg",
  "size": 198543,
  "uploadedAt": "2026-01-10T10:02:00.000Z"
}
```

## Etape 4: Verifier les Images

Verifiez que les deux images sont bien uploadees.

```bash
curl "http://localhost:3000/sessions/${SESSION_ID}/images?userId=1"
```

**Reponse**:

```json
[
  {
    "id": "img-front-uuid",
    "side": "FRONT",
    "url": "/uploads/sessions/1704880800-front.jpg",
    "filename": "charizard-front.jpg",
    "uploadedAt": "2026-01-10T10:01:00.000Z"
  },
  {
    "id": "img-back-uuid",
    "side": "BACK",
    "url": "/uploads/sessions/1704880860-back.jpg",
    "filename": "charizard-back.jpg",
    "uploadedAt": "2026-01-10T10:02:00.000Z"
  }
]
```

Vous devez avoir exactement 2 images: une `FRONT` et une `BACK`.

## Etape 5: Lancer l'Analyse ML

Declenchez l'analyse avec l'echelle de notation souhaitee (PCA ou PSA).

```bash
curl -X POST "http://localhost:3000/sessions/${SESSION_ID}/analyze?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "scale": "PSA"
  }'
```

**Reponse**:

```json
{
  "id": "result-uuid",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "scale": "PSA",
  "centering": 9.2,
  "corners": 8.5,
  "edges": 8.8,
  "surface": 9.0,
  "printQuality": 8.7,
  "finalGrade": 8.5,
  "gradeLabel": "NM-MT",
  "confidence": 0.92,
  "modelVersion": "mvp-v1",
  "analysisData": {
    "frontAnalysis": { ... },
    "backAnalysis": { ... }
  },
  "createdAt": "2026-01-10T10:05:00.000Z"
}
```

## Etape 6: Verifier le Status de la Session

La session devrait maintenant etre en status `COMPLETED`.

```bash
curl "http://localhost:3000/sessions/${SESSION_ID}?userId=1"
```

**Reponse**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": 1,
  "cardName": "Charizard Holo",
  "cardSet": "Base Set",
  "cardYear": 1999,
  "cardType": "Pokemon",
  "status": "COMPLETED",
  "images": [
    { "id": "img-front-uuid", "side": "FRONT", ... },
    { "id": "img-back-uuid", "side": "BACK", ... }
  ],
  "gradeResults": [
    {
      "id": "result-uuid",
      "scale": "PSA",
      "centering": 9.2,
      "corners": 8.5,
      "edges": 8.8,
      "surface": 9.0,
      "printQuality": 8.7,
      "finalGrade": 8.5,
      "gradeLabel": "NM-MT",
      "confidence": 0.92,
      "createdAt": "2026-01-10T10:05:00.000Z"
    }
  ],
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-01-10T10:05:00.000Z",
  "completedAt": "2026-01-10T10:05:00.000Z"
}
```

## Etape 7: Recuperer les Resultats

Vous pouvez recuperer les resultats a tout moment.

```bash
curl "http://localhost:3000/sessions/${SESSION_ID}/results?userId=1"
```

## Interpretation des Resultats

### Criteres de Notation

| Critere | Score | Interpretation |
|---------|-------|----------------|
| `centering` | 9.2 | Excellent centrage |
| `corners` | 8.5 | Coins en tres bon etat |
| `edges` | 8.8 | Bords en excellent etat |
| `surface` | 9.0 | Surface quasi parfaite |
| `printQuality` | 8.7 | Impression de haute qualite |

### Note Finale

- **finalGrade**: 8.5 (minimum des 5 criteres, arrondi)
- **gradeLabel**: NM-MT (Near Mint-Mint)
- **confidence**: 0.92 (92% de confiance du modele)

### Echelle de Notation PSA

| Grade | Label | Description |
|-------|-------|-------------|
| 10 | Gem Mint | Parfait |
| 9 | Mint | Quasi parfait |
| 8 | NM-MT | Tres bon etat |
| 7 | NM | Bon etat |
| 6 | EX-MT | Etat correct |
| 5-1 | ... | Usure visible |

## Script Complet

Voici un script bash complet pour automatiser le processus:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
USER_ID=1
FRONT_IMAGE="./card-front.jpg"
BACK_IMAGE="./card-back.jpg"

echo "=== Card Grading Session ==="

# 1. Creer la session
echo "Creating session..."
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '"${USER_ID}"',
    "cardName": "Test Card",
    "cardType": "Pokemon"
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.id')
echo "Session created: ${SESSION_ID}"

# 2. Upload image recto
echo "Uploading front image..."
curl -s -X POST "${API_URL}/sessions/${SESSION_ID}/images?userId=${USER_ID}" \
  -F "image=@${FRONT_IMAGE}" \
  -F "side=FRONT" > /dev/null

echo "Front image uploaded"

# 3. Upload image verso
echo "Uploading back image..."
curl -s -X POST "${API_URL}/sessions/${SESSION_ID}/images?userId=${USER_ID}" \
  -F "image=@${BACK_IMAGE}" \
  -F "side=BACK" > /dev/null

echo "Back image uploaded"

# 4. Lancer l'analyse
echo "Starting analysis..."
RESULT=$(curl -s -X POST "${API_URL}/sessions/${SESSION_ID}/analyze?userId=${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"scale": "PSA"}')

# 5. Afficher les resultats
echo ""
echo "=== RESULTS ==="
echo $RESULT | jq '{
  finalGrade: .finalGrade,
  gradeLabel: .gradeLabel,
  confidence: .confidence,
  criteria: {
    centering: .centering,
    corners: .corners,
    edges: .edges,
    surface: .surface,
    printQuality: .printQuality
  }
}'
```

## Gestion des Erreurs

### Images manquantes

Si vous essayez de lancer l'analyse sans les deux images:

```bash
curl -X POST "http://localhost:3000/sessions/${SESSION_ID}/analyze?userId=1" \
  -H "Content-Type: application/json" \
  -d '{"scale": "PSA"}'
```

**Erreur (400)**:

```json
{
  "statusCode": 400,
  "message": "Session must have both FRONT and BACK images before analysis",
  "error": "Bad Request"
}
```

### Image deja existante

Si vous essayez d'uploader une deuxieme image FRONT:

```json
{
  "statusCode": 400,
  "message": "An image for FRONT side already exists. Delete it first.",
  "error": "Bad Request"
}
```

**Solution**: Supprimez d'abord l'image existante:

```bash
curl -X DELETE "http://localhost:3000/sessions/${SESSION_ID}/images/${IMAGE_ID}?userId=1"
```

### Service ML indisponible

Si le service ML n'est pas en cours d'execution:

```json
{
  "statusCode": 503,
  "message": "ML Service unavailable",
  "error": "Service Unavailable"
}
```

**Solution**: Demarrez le service ML ou activez le fallback mock dans `.env`:

```env
ML_ENABLE_FALLBACK=true
```

## Bonnes Pratiques

1. **Qualite des images**: Utilisez des images haute resolution (min 1000x1000px)
2. **Eclairage**: Evitez les reflets et ombres
3. **Cadrage**: Centrez la carte dans l'image
4. **Format**: JPEG ou PNG recommandes
5. **Taille**: Max 10MB par image

## Liens Utiles

- [Reference API complete](../endpoints.md)
- [Documentation Architecture](../../architecture/overview.md)
- [Guide d'installation](../../getting-started/installation.md)
