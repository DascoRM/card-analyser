# Plan de correction - Bug d'upload d'images

## Diagnostic

### Cause racine identifiée

Le bug se situe dans `/apps/api/src/sessions/sessions.module.ts` aux lignes 27-32.

**Problème**: Le fileFilter Multer utilise une regex incorrecte qui échoue APRÈS avoir uploadé le fichier.

```typescript
fileFilter: (req, file, cb) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
},
```

**Pourquoi l'upload réussit mais l'erreur apparaît quand même ?**

1. Multer utilise le `diskStorage` configuré qui écrit immédiatement le fichier sur disque (ligne 15-23)
2. Le fichier est créé AVANT que le `fileFilter` ne soit exécuté
3. Le `fileFilter` vérifie le mimetype APRÈS l'écriture du fichier
4. La regex `/\/(jpg|jpeg|png)$/` cherche un slash `/` suivi de jpg|jpeg|png à la fin
5. Pour un mimetype comme `image/jpeg`, la regex match correctement
6. MAIS pour certains clients HTTP ou navigateurs, le mimetype peut être `image/jpg` ou avoir des variations

**Scénario du bug:**
- Client envoie un fichier avec mimetype = `image/jpg` (valide)
- Multer écrit le fichier dans `./uploads/sessions/` (réussit)
- fileFilter s'exécute et vérifie le mimetype
- La regex peut échouer si le mimetype n'est pas exactement `image/jpeg`, `image/jpg` ou `image/png`
- L'erreur "Only image files are allowed!" est levée
- Le fichier reste sur le disque mais l'API retourne une erreur

### Deuxième problème potentiel

Le `fileFilter` ne vérifie QUE le mimetype, pas l'extension du fichier. Un attaquant pourrait envoyer un fichier malveillant avec un mimetype falsifié `image/jpeg`.

## Solution proposée

### 1. Corriger la regex du fileFilter

**Fichier**: `/apps/api/src/sessions/sessions.module.ts`

**Changement ligne 28**:

```typescript
// AVANT (incorrect)
if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {

// APRÈS (correct)
if (!file.mimetype.match(/^image\/(jpg|jpeg|png)$/)) {
```

**Explication**:
- `^image\/` force le mimetype à commencer par "image/"
- `(jpg|jpeg|png)$` vérifie que ça se termine par jpg, jpeg ou png
- Cela match correctement: `image/jpeg`, `image/jpg`, `image/png`

### 2. Ajouter une validation d'extension

Pour renforcer la sécurité, valider AUSSI l'extension du fichier:

```typescript
fileFilter: (req, file, cb) => {
  // Vérifier le mimetype
  const validMimetypes = /^image\/(jpg|jpeg|png)$/;
  const isMimetypeValid = validMimetypes.test(file.mimetype);

  // Vérifier l'extension
  const validExtensions = /\.(jpg|jpeg|png)$/i;
  const isExtensionValid = validExtensions.test(file.originalname.toLowerCase());

  if (isMimetypeValid && isExtensionValid) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG and PNG image files are allowed!'), false);
  }
},
```

### 3. Gérer le nettoyage des fichiers orphelins

Optionnel mais recommandé: Si le fileFilter rejette un fichier, le fichier reste sur le disque. Ajouter un mécanisme de nettoyage.

**Option A**: Utiliser `memoryStorage` au lieu de `diskStorage` pour ne pas écrire sur disque avant validation

**Option B**: Ajouter un exception filter global qui supprime les fichiers temporaires en cas d'erreur

## Code final recommandé

```typescript
// apps/api/src/sessions/sessions.module.ts
MulterModule.register({
  storage: diskStorage({
    destination: './uploads/sessions',
    filename: (req, file, cb) => {
      const uniqueSuffix =
        Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Vérifier mimetype ET extension pour plus de sécurité
    const validMimetypes = /^image\/(jpg|jpeg|png)$/;
    const validExtensions = /\.(jpg|jpeg|png)$/i;

    const isMimetypeValid = validMimetypes.test(file.mimetype);
    const isExtensionValid = validExtensions.test(file.originalname.toLowerCase());

    if (isMimetypeValid && isExtensionValid) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG and PNG image files are allowed!'), false);
    }
  },
}),
```

## Tests à effectuer après correction

1. Upload d'un fichier JPEG valide → doit réussir
2. Upload d'un fichier PNG valide → doit réussir
3. Upload d'un fichier JPG valide → doit réussir
4. Upload d'un fichier PDF → doit échouer avec le bon message d'erreur
5. Upload d'un fichier avec extension .jpg mais mimetype incorrect → doit échouer
6. Upload d'un fichier trop lourd (>10MB) → doit échouer avec erreur de taille
7. Vérifier qu'aucun fichier orphelin ne reste dans `./uploads/sessions/` après un upload rejeté

## Impact

- Correction simple (modification d'une regex)
- Pas de breaking change pour l'API
- Amélioration de la sécurité
- Résolution du bug d'affichage d'erreur après upload réussi

## Fichiers à modifier

1. `/apps/api/src/sessions/sessions.module.ts` (lignes 27-32)

## Temps estimé

- Correction: 5 minutes
- Tests: 15 minutes
- Total: 20 minutes
