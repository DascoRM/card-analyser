# Reference API - Endpoints

Documentation complete de tous les endpoints de l'API Card Grading.

**Base URL**: `http://localhost:3000`

**Documentation Swagger**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Sessions

Gestion des sessions de grading.

### POST /sessions

Creer une nouvelle session de grading.

**Request Body**:

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur |
| `cardName` | string | Non | Nom de la carte |
| `cardSet` | string | Non | Set/Edition de la carte |
| `cardYear` | integer | Non | Annee de la carte (1900-2100) |
| `cardType` | string | Non | Type de carte (Pokemon, Sports, etc.) |

**Exemple**:

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

**Response (201)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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

---

### GET /sessions

Lister toutes les sessions d'un utilisateur.

**Query Parameters**:

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur |
| `status` | enum | Non | Filtrer par status |
| `cardType` | string | Non | Filtrer par type de carte |

**Status possibles**: `PENDING`, `UPLOADING`, `ANALYZING`, `COMPLETED`, `FAILED`, `ARCHIVED`

**Exemple**:

```bash
# Toutes les sessions
curl "http://localhost:3000/sessions?userId=1"

# Sessions completees uniquement
curl "http://localhost:3000/sessions?userId=1&status=COMPLETED"

# Sessions Pokemon
curl "http://localhost:3000/sessions?userId=1&cardType=Pokemon"
```

**Response (200)**:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": 1,
    "cardName": "Charizard Holo",
    "status": "COMPLETED",
    "images": [...],
    "gradeResults": [...],
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:30:00.000Z",
    "completedAt": "2026-01-10T10:30:00.000Z"
  }
]
```

---

### GET /sessions/:id

Recuperer une session par son ID.

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la session |

**Query Parameters**:

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur (verification ownership) |

**Exemple**:

```bash
curl "http://localhost:3000/sessions/550e8400-e29b-41d4-a716-446655440000?userId=1"
```

**Response (200)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "cardName": "Charizard Holo",
  "cardSet": "Base Set",
  "cardYear": 1999,
  "cardType": "Pokemon",
  "status": "COMPLETED",
  "images": [
    {
      "id": "image-uuid-1",
      "side": "FRONT",
      "url": "/uploads/sessions/front-abc123.jpg",
      "filename": "charizard-front.jpg",
      "uploadedAt": "2026-01-10T10:05:00.000Z"
    },
    {
      "id": "image-uuid-2",
      "side": "BACK",
      "url": "/uploads/sessions/back-abc123.jpg",
      "filename": "charizard-back.jpg",
      "uploadedAt": "2026-01-10T10:06:00.000Z"
    }
  ],
  "gradeResults": [
    {
      "id": "result-uuid",
      "scale": "PSA",
      "centering": 9.0,
      "corners": 8.5,
      "edges": 9.0,
      "surface": 8.0,
      "printQuality": 9.0,
      "finalGrade": 8.0,
      "gradeLabel": "NM-MT",
      "confidence": 0.92,
      "createdAt": "2026-01-10T10:30:00.000Z"
    }
  ],
  "createdAt": "2026-01-10T10:00:00.000Z",
  "updatedAt": "2026-01-10T10:30:00.000Z",
  "completedAt": "2026-01-10T10:30:00.000Z"
}
```

**Errors**:

| Code | Description |
|------|-------------|
| 404 | Session non trouvee |
| 403 | L'utilisateur n'est pas proprietaire de la session |

---

### PATCH /sessions/:id

Mettre a jour une session.

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la session |

**Query Parameters**:

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur |

**Request Body** (tous optionnels):

| Champ | Type | Description |
|-------|------|-------------|
| `cardName` | string | Nom de la carte |
| `cardSet` | string | Set de la carte |
| `cardYear` | integer | Annee de la carte |
| `cardType` | string | Type de carte |

**Exemple**:

```bash
curl -X PATCH "http://localhost:3000/sessions/550e8400-...?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Charizard Holo 1st Edition"
  }'
```

---

### DELETE /sessions/:id

Archiver une session (soft delete).

**Note**: La session n'est pas supprimee, son status passe a `ARCHIVED`.

**Exemple**:

```bash
curl -X DELETE "http://localhost:3000/sessions/550e8400-...?userId=1"
```

---

## Images

Gestion des images des sessions.

### POST /sessions/:id/images

Uploader une image (recto ou verso).

**Content-Type**: `multipart/form-data`

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la session |

**Query Parameters**:

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur |

**Form Data**:

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `image` | file | Oui | Fichier image (JPEG, PNG) |
| `side` | enum | Oui | `FRONT` ou `BACK` |

**Exemple**:

```bash
# Upload image recto
curl -X POST "http://localhost:3000/sessions/550e8400-...?userId=1/images" \
  -F "image=@/path/to/front.jpg" \
  -F "side=FRONT"

# Upload image verso
curl -X POST "http://localhost:3000/sessions/550e8400-...?userId=1/images" \
  -F "image=@/path/to/back.jpg" \
  -F "side=BACK"
```

**Response (201)**:

```json
{
  "id": "image-uuid",
  "sessionId": "550e8400-...",
  "side": "FRONT",
  "url": "/uploads/sessions/front-abc123.jpg",
  "filename": "front.jpg",
  "mimeType": "image/jpeg",
  "size": 245678,
  "uploadedAt": "2026-01-10T10:05:00.000Z"
}
```

**Errors**:

| Code | Description |
|------|-------------|
| 400 | Une image pour ce cote existe deja |
| 400 | Session dans un status invalide |
| 404 | Session non trouvee |

---

### GET /sessions/:id/images

Lister les images d'une session.

**Exemple**:

```bash
curl "http://localhost:3000/sessions/550e8400-...?userId=1/images"
```

**Response (200)**:

```json
[
  {
    "id": "image-uuid-1",
    "side": "FRONT",
    "url": "/uploads/sessions/front-abc123.jpg",
    "filename": "front.jpg",
    "uploadedAt": "2026-01-10T10:05:00.000Z"
  },
  {
    "id": "image-uuid-2",
    "side": "BACK",
    "url": "/uploads/sessions/back-abc123.jpg",
    "filename": "back.jpg",
    "uploadedAt": "2026-01-10T10:06:00.000Z"
  }
]
```

---

### DELETE /sessions/:id/images/:imageId

Supprimer une image.

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la session |
| `imageId` | UUID | ID de l'image |

**Exemple**:

```bash
curl -X DELETE "http://localhost:3000/sessions/550e8400-.../images/image-uuid?userId=1"
```

---

## Analyse

Declenchement de l'analyse ML.

### POST /sessions/:id/analyze

Declencher l'analyse ML de la session.

**Prerequis**: La session doit avoir les images FRONT et BACK uploadees.

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID de la session |

**Query Parameters**:

| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `userId` | integer | Oui | ID de l'utilisateur |

**Request Body**:

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `scale` | enum | Oui | `PCA` ou `PSA` |

**Exemple**:

```bash
curl -X POST "http://localhost:3000/sessions/550e8400-...?userId=1/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "scale": "PSA"
  }'
```

**Response (200)**:

```json
{
  "id": "result-uuid",
  "sessionId": "550e8400-...",
  "scale": "PSA",
  "centering": 9.0,
  "corners": 8.5,
  "edges": 9.0,
  "surface": 8.0,
  "printQuality": 9.0,
  "finalGrade": 8.0,
  "gradeLabel": "NM-MT",
  "confidence": 0.92,
  "modelVersion": "mvp-v1",
  "analysisData": {},
  "createdAt": "2026-01-10T10:30:00.000Z"
}
```

**Errors**:

| Code | Description |
|------|-------------|
| 400 | Images FRONT et/ou BACK manquantes |
| 400 | Session dans un status invalide |
| 503 | Service ML indisponible |

---

### GET /sessions/:id/results

Recuperer les resultats de grading.

**Exemple**:

```bash
curl "http://localhost:3000/sessions/550e8400-...?userId=1/results"
```

**Response (200)**:

```json
[
  {
    "id": "result-uuid",
    "sessionId": "550e8400-...",
    "scale": "PSA",
    "centering": 9.0,
    "corners": 8.5,
    "edges": 9.0,
    "surface": 8.0,
    "printQuality": 9.0,
    "finalGrade": 8.0,
    "gradeLabel": "NM-MT",
    "confidence": 0.92,
    "createdAt": "2026-01-10T10:30:00.000Z"
  }
]
```

---

## ML Service

Endpoints pour interagir avec le service ML.

### GET /ml/health

Verifier la sante du service ML.

**Exemple**:

```bash
curl http://localhost:3000/ml/health
```

**Response (200)**:

```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "1.0.0",
  "timestamp": 1704880800.123
}
```

---

### GET /ml/model/info

Obtenir les informations sur le modele ML.

**Exemple**:

```bash
curl http://localhost:3000/ml/model/info
```

**Response (200)**:

```json
{
  "version": "mvp-v1",
  "lastUpdated": "2026-01-10",
  "inputShape": [224, 224, 3],
  "outputClasses": 10
}
```

---

## Enums

### SessionStatus

| Valeur | Description |
|--------|-------------|
| `PENDING` | Session creee, en attente d'images |
| `UPLOADING` | Upload d'images en cours |
| `ANALYZING` | Analyse ML en cours |
| `COMPLETED` | Analyse terminee avec succes |
| `FAILED` | Analyse echouee |
| `ARCHIVED` | Session archivee (soft delete) |

### CardSide

| Valeur | Description |
|--------|-------------|
| `FRONT` | Recto de la carte |
| `BACK` | Verso de la carte |

### GradeScale

| Valeur | Description |
|--------|-------------|
| `PCA` | Echelle PCA (1-10) |
| `PSA` | Echelle PSA (1-10) |

---

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Donnees invalides |
| 401 | Unauthorized - Non authentifie |
| 403 | Forbidden - Acces refuse |
| 404 | Not Found - Ressource introuvable |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Service ML indisponible |

---

## Labels de Grade

| Note | Label |
|------|-------|
| 10 | Gem Mint |
| 9 | Mint |
| 8 | NM-MT (Near Mint-Mint) |
| 7 | NM (Near Mint) |
| 6 | EX-MT (Excellent-Mint) |
| 5 | EX (Excellent) |
| 4 | VG-EX (Very Good-Excellent) |
| 3 | VG (Very Good) |
| 2 | Good |
| 1 | Poor |
