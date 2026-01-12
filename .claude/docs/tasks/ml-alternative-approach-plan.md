# Plan Architecture ML Alternative - Card Grading System

**Agent**: tensorflow-ml-agent
**Date**: 2026-01-11
**Version**: 1.0
**Contexte**: Approche hybride rule-based + ML avec feedback loop utilisateur

---

## 1. Vue d'ensemble de l'approche

### 1.1 Problématique

**Limites de l'approche pure ML actuelle**:
- Besoin de milliers d'images annotées par des experts PCA/PSA (coûteux)
- Subjectivité du grading humain = dataset bruité
- Difficulté à atteindre la précision des gradeurs professionnels
- Modèle "boîte noire" difficile à expliquer aux utilisateurs

**Solution proposée**: Système hybride évolutif en 3 couches

```
┌─────────────────────────────────────────────────────────┐
│  COUCHE 1: Rule-Based Engine (Règles métier extraites)  │
│  → Analyse déterministe basée sur standards officiels   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  COUCHE 2: Computer Vision (Détection & Mesure)         │
│  → OpenCV + détection objets pour extraction features   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  COUCHE 3: ML Corrections (Apprentissage feedback)      │
│  → Modèle léger s'améliorant avec corrections users     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  BONUS: Card Recognition + Pricing API                  │
│  → OCR + Vision pour identifier carte + prix marché     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 - Rule-Based Engine (Fondation)

### 2.1 Extraction des règles métier

**Sources documentaires analysées**:
1. **Beckett Grading Standards**: 4 subgrades (Centering, Corners, Edges, Surface)
2. **CGC Cards Scale**: Centering ratios précis (60/40, 65/35, 70/30, 75/25)
3. **Card Centering Calculator**: Formules de calcul ratio bordures
4. **PokeGrade**: Spécificités Pokémon (factory centering issues)
5. **TCFever Guide**: Comparaison PSA/BGS/CGC/SGC

**Règles extraites et codifiables**:

#### A. Centering (Centrage)
```python
# Règle déterministe basée sur mesures bordures
def calculate_centering_score(left_border, right_border, top_border, bottom_border):
    """
    Input: Largeurs des bordures en pixels (détectées via OpenCV)
    Output: Score 1-10 + détails
    """
    # Ratio horizontal
    h_ratio = max(left, right) / min(left, right) if min(left, right) > 0 else 100
    # Ratio vertical
    v_ratio = max(top, bottom) / min(top, bottom) if min(top, bottom) > 0 else 100

    # Règles officielles CGC/Beckett
    if h_ratio <= 1.1 and v_ratio <= 1.1:  # 55/45 ou mieux
        return 10  # Gem Mint
    elif h_ratio <= 1.5 and v_ratio <= 1.5:  # 60/40
        return 9   # Mint
    elif h_ratio <= 1.86 and v_ratio <= 1.86:  # 65/35
        return 8   # Near Mint+
    elif h_ratio <= 2.33 and v_ratio <= 2.33:  # 70/30
        return 7   # Near Mint
    elif h_ratio <= 3.0 and v_ratio <= 3.0:  # 75/25
        return 6   # Excellent
    else:
        return max(1, 5 - int((h_ratio + v_ratio) / 2))  # Dégressif
```

#### B. Corners (Coins)
```python
# Règle semi-déterministe avec Computer Vision
def analyze_corner_quality(corner_image_crop):
    """
    Input: Crop 50x50px de chaque coin (4 au total)
    Output: Score par coin + défauts détectés
    """
    defects = {
        'whitening': detect_white_pixels_ratio(corner_crop),
        'rounding': detect_corner_sharpness(corner_crop),  # Contour analysis
        'ding': detect_damage_edges(corner_crop),
        'bend': detect_fold_lines(corner_crop)
    }

    # Règles officielles
    if all(d == 0 for d in defects.values()):
        return 10  # Perfect corner
    elif defects['whitening'] < 2% and defects['rounding'] < 5%:
        return 9   # Minor wear
    elif defects['whitening'] < 5%:
        return 8
    elif defects['whitening'] < 10%:
        return 7
    else:
        return max(1, 6 - int(defects['whitening'] / 5))
```

#### C. Edges (Arêtes)
```python
def analyze_edge_quality(edge_image_strip):
    """
    Input: Bande 10px de largeur sur toute la longueur de l'arête
    Output: Score par arête (4 au total)
    """
    defects = {
        'whitening': detect_edge_whitening(edge_strip),  # PCA très strict
        'chipping': detect_chips(edge_strip),
        'roughness': detect_fraying(edge_strip),
        'indent': detect_dents(edge_strip)
    }

    # PCA plus strict que PSA sur whitening
    if defects['whitening'] == 0:
        return 10
    elif defects['whitening'] < 1%:  # PCA: tolérance quasi-nulle
        return 9
    elif defects['whitening'] < 3%:
        return 8
    elif defects['whitening'] < 5%:
        return 7
    else:
        return max(1, 6 - int(defects['whitening'] / 3))
```

#### D. Surface
```python
def analyze_surface_quality(card_image_full):
    """
    Input: Image complète recto ET verso
    Output: Score surface + défauts
    """
    defects_front = {
        'scratches': detect_linear_artifacts(front_img),
        'print_lines': detect_roller_marks(front_img),
        'stains': detect_color_anomalies(front_img),
        'creases': detect_fold_patterns(front_img)
    }
    defects_back = analyze_same(back_img)

    # Règles strictes
    if no_defects(defects_front) and no_defects(defects_back):
        return 10
    elif minor_defects_only(defects_front, defects_back):
        return 9
    # ... etc
```

#### E. Print Quality
```python
def analyze_print_quality(card_image):
    """
    Défauts d'usine UNIQUEMENT (pas d'usure utilisateur)
    """
    factory_defects = {
        'ink_dots': detect_ink_spots(image),
        'miscut': detect_cut_alignment(image),
        'color_bleeding': detect_color_registration(image),
        'focus': detect_blur_factory(image)
    }
    # Scoring basé sur gravité défauts usine
```

### 2.2 Computer Vision Pipeline (OpenCV)

**Outils nécessaires**:
```python
# preprocessing/cv_detector.py

import cv2
import numpy as np
from typing import Tuple, Dict

class CardDetector:
    """Détection et extraction de la carte dans l'image"""

    def detect_card_contour(self, image: np.ndarray) -> np.ndarray:
        """
        1. Conversion grayscale
        2. Détection contours (Canny edge detection)
        3. Identification du plus grand rectangle (carte)
        4. Perspective transform pour redresser
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Trouver le plus grand contour rectangulaire
        card_contour = max(contours, key=cv2.contourArea)
        return self._perspective_transform(image, card_contour)

    def measure_borders(self, card_image: np.ndarray) -> Dict[str, float]:
        """
        Mesure précise des bordures pour centering
        Retourne: {left, right, top, bottom} en pixels
        """
        # Détection du cadre intérieur de la carte
        # vs. bords extérieurs
        pass

    def extract_corners(self, card_image: np.ndarray) -> List[np.ndarray]:
        """Découpe les 4 coins (50x50px chacun)"""
        h, w = card_image.shape[:2]
        corners = [
            card_image[0:50, 0:50],           # Top-left
            card_image[0:50, w-50:w],         # Top-right
            card_image[h-50:h, 0:50],         # Bottom-left
            card_image[h-50:h, w-50:w]        # Bottom-right
        ]
        return corners

    def extract_edges(self, card_image: np.ndarray) -> List[np.ndarray]:
        """Découpe les 4 arêtes (bande 10px)"""
        h, w = card_image.shape[:2]
        edges = [
            card_image[0:10, :],              # Top edge
            card_image[:, w-10:w],            # Right edge
            card_image[h-10:h, :],            # Bottom edge
            card_image[:, 0:10]               # Left edge
        ]
        return edges


class DefectDetector:
    """Détection de défauts spécifiques"""

    def detect_whitening(self, region: np.ndarray) -> float:
        """
        Détecte le blanchiment (whitening) sur coins/arêtes
        Retourne: pourcentage de pixels blancs (0-100)
        """
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
        # Seuil pour blanc: V > 200, S < 30
        white_mask = cv2.inRange(hsv, (0, 0, 200), (180, 30, 255))
        white_ratio = np.sum(white_mask > 0) / white_mask.size * 100
        return white_ratio

    def detect_scratches(self, surface: np.ndarray) -> int:
        """
        Détecte rayures via détection de lignes (Hough Transform)
        Retourne: nombre de rayures détectées
        """
        gray = cv2.cvtColor(surface, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=20, maxLineGap=5)
        return len(lines) if lines is not None else 0

    def detect_corner_sharpness(self, corner_crop: np.ndarray) -> float:
        """
        Mesure la netteté du coin (rounding detection)
        Retourne: score 0-100 (100 = parfaitement sharp)
        """
        # Analyse du gradient aux angles
        # Un coin arrondi a un gradient plus doux
        pass
```

### 2.3 Rule-Based Scoring Engine

```python
# inference/rule_based_grader.py

from typing import Dict, List
from preprocessing.cv_detector import CardDetector, DefectDetector

class RuleBasedGrader:
    """
    Moteur de notation basé sur les règles officielles extraites
    """

    def __init__(self):
        self.detector = CardDetector()
        self.defect_detector = DefectDetector()

    def grade_card(self, front_image: np.ndarray, back_image: np.ndarray) -> Dict:
        """
        Pipeline complet de grading rule-based
        """
        # 1. Détection et extraction carte
        front_card = self.detector.detect_card_contour(front_image)
        back_card = self.detector.detect_card_contour(back_image)

        # 2. Analyse par critère
        centering_score = self._grade_centering(front_card, back_card)
        corners_score = self._grade_corners(front_card, back_card)
        edges_score = self._grade_edges(front_card, back_card)
        surface_score = self._grade_surface(front_card, back_card)
        print_quality_score = self._grade_print_quality(front_card)

        # 3. Note finale = MIN (règle PCA/PSA)
        final_grade = min(
            centering_score['score'],
            corners_score['score'],
            edges_score['score'],
            surface_score['score'],
            print_quality_score['score']
        )

        return {
            'final_grade': final_grade,
            'grade_label': self._get_grade_label(final_grade),
            'scores': {
                'centering': centering_score,
                'corners': corners_score,
                'edges': edges_score,
                'surface': surface_score,
                'print_quality': print_quality_score
            },
            'method': 'rule_based_v1',
            'confidence': self._calculate_confidence(front_image, back_image)
        }

    def _grade_centering(self, front: np.ndarray, back: np.ndarray) -> Dict:
        borders_front = self.detector.measure_borders(front)
        borders_back = self.detector.measure_borders(back)

        # Calcul ratios
        h_ratio_front = max(borders_front['left'], borders_front['right']) / \
                       min(borders_front['left'], borders_front['right'])
        v_ratio_front = max(borders_front['top'], borders_front['bottom']) / \
                       min(borders_front['top'], borders_front['bottom'])

        # Scoring selon règles officielles
        score = self._apply_centering_rules(h_ratio_front, v_ratio_front)

        return {
            'score': score,
            'details': {
                'front_horizontal_ratio': f"{int(100/(1+h_ratio_front))}/{int(100*h_ratio_front/(1+h_ratio_front))}",
                'front_vertical_ratio': f"{int(100/(1+v_ratio_front))}/{int(100*v_ratio_front/(1+v_ratio_front))}",
                'back_horizontal_ratio': '...',
                'offset_percentage': max(abs(1-h_ratio_front), abs(1-v_ratio_front)) * 100
            }
        }

    def _grade_corners(self, front: np.ndarray, back: np.ndarray) -> Dict:
        corners_front = self.detector.extract_corners(front)
        corners_back = self.detector.extract_corners(back)

        corner_scores = []
        corner_details = []

        for i, corner in enumerate(corners_front):
            whitening = self.defect_detector.detect_whitening(corner)
            sharpness = self.defect_detector.detect_corner_sharpness(corner)

            # Règles PCA strictes
            if whitening == 0 and sharpness > 95:
                score = 10
            elif whitening < 2 and sharpness > 90:
                score = 9
            elif whitening < 5:
                score = 8
            else:
                score = max(1, 7 - int(whitening / 5))

            corner_scores.append(score)
            corner_details.append({
                'position': ['top_left', 'top_right', 'bottom_left', 'bottom_right'][i],
                'score': score,
                'whitening_percent': whitening,
                'sharpness': sharpness
            })

        return {
            'score': min(corner_scores),  # Le pire coin définit la note
            'details': corner_details
        }

    # ... Méthodes similaires pour edges, surface, print_quality

    @staticmethod
    def _get_grade_label(score: int) -> str:
        labels = {
            10: "Gem Mint",
            9: "Mint",
            8: "Near Mint / Mint",
            7: "Near Mint",
            6: "Excellent",
            5: "Very Good",
            4: "Good",
            3: "Fair",
            2: "Poor",
            1: "Poor"
        }
        return labels.get(score, "Unknown")
```

---

## 3. Phase 2 - Machine Learning Correction Layer

### 3.1 Stratégie d'apprentissage par feedback

**Principe**: L'utilisateur corrige les scores → création automatique du dataset d'entraînement

```
┌─────────────────────────────────────────────────────────┐
│  User Upload Card Images                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Rule-Based Engine génère scores initiaux               │
│  Centering: 8, Corners: 9, Edges: 7, Surface: 9, Print: 10│
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  User Interface: Affiche scores + permet corrections    │
│  [Centering: 8 → User change to 9]                      │
│  [Corners: 9 → User confirms]                           │
│  [Edges: 7 → User change to 6]                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Database: Sauvegarde (image, rule_scores, user_scores) │
│  → Devient training sample                              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  ML Model: Apprend corrections utilisateur              │
│  Input: [image_features, rule_scores]                   │
│  Output: [corrected_scores]                             │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Architecture ML légère (Correction Model)

**Approche**: Ne pas remplacer rule-based, mais apprendre les corrections

```python
# training/correction_model.py

import tensorflow as tf
from tensorflow import keras

class CorrectionModel:
    """
    Modèle léger qui apprend à corriger les scores rule-based
    Input: Features visuelles + Scores rule-based
    Output: Delta corrections pour chaque critère
    """

    def build_model(self):
        # Input 1: Features visuelles (EfficientNetV2 embeddings)
        image_input = keras.Input(shape=(224, 224, 3), name='card_image')
        base_model = keras.applications.EfficientNetV2S(
            include_top=False,
            weights='imagenet',
            input_tensor=image_input
        )
        base_model.trainable = False  # Freeze au début

        image_features = base_model.output
        image_features = keras.layers.GlobalAveragePooling2D()(image_features)

        # Input 2: Scores rule-based (5 critères)
        rule_scores_input = keras.Input(shape=(5,), name='rule_scores')

        # Input 3: Features numériques détectées (centering ratios, whitening %, etc.)
        numeric_features_input = keras.Input(shape=(20,), name='numeric_features')

        # Fusion
        combined = keras.layers.concatenate([
            image_features,
            rule_scores_input,
            numeric_features_input
        ])

        # Dense layers
        x = keras.layers.Dense(256, activation='relu')(combined)
        x = keras.layers.Dropout(0.3)(x)
        x = keras.layers.Dense(128, activation='relu')(x)

        # Outputs: Corrections pour chaque critère (-3 à +3)
        corrections = keras.layers.Dense(5, activation='tanh', name='corrections')(x)
        # tanh donne [-1, 1], on scale à [-3, 3]
        corrections_scaled = keras.layers.Lambda(lambda x: x * 3)(corrections)

        model = keras.Model(
            inputs=[image_input, rule_scores_input, numeric_features_input],
            outputs=corrections_scaled
        )

        return model

    def train_from_feedback(self, feedback_dataset):
        """
        Entraîne le modèle sur les corrections utilisateurs
        """
        model = self.build_model()

        model.compile(
            optimizer=keras.optimizers.Adam(1e-4),
            loss='mse',  # Mean Squared Error sur les deltas
            metrics=['mae']
        )

        # Dataset format:
        # X = {
        #   'card_image': np.array,
        #   'rule_scores': [8, 9, 7, 9, 10],
        #   'numeric_features': [ratio_h, ratio_v, whitening_%, ...]
        # }
        # Y = [+1, 0, -1, 0, 0]  # Deltas entre rule et user

        history = model.fit(
            feedback_dataset,
            validation_split=0.2,
            epochs=50,
            batch_size=32,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
                keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
            ]
        )

        return model, history
```

### 3.3 Système de confiance (Confidence Scoring)

```python
class ConfidenceCalculator:
    """
    Calcule un score de confiance 0-1 pour l'estimation
    """

    def calculate_confidence(
        self,
        image_quality: Dict,
        rule_based_consistency: Dict,
        ml_prediction_variance: float,
        user_feedback_count: int
    ) -> float:
        """
        Facteurs de confiance:
        1. Qualité image (netteté, éclairage, angle)
        2. Cohérence détections (ex: si 3 coins parfaits et 1 très abîmé = suspect)
        3. Variance prédiction ML (si modèle hésite)
        4. Nombre de feedbacks similaires dans le dataset
        """

        # 1. Qualité image (0-1)
        quality_score = self._assess_image_quality(image_quality)

        # 2. Cohérence (si tous les critères sont cohérents)
        consistency_score = self._assess_consistency(rule_based_consistency)

        # 3. Certitude ML (si variance faible)
        ml_certainty = 1 / (1 + ml_prediction_variance)

        # 4. Expérience (plus de feedback = plus confiant)
        experience_factor = min(1.0, user_feedback_count / 1000)

        # Moyenne pondérée
        confidence = (
            0.3 * quality_score +
            0.3 * consistency_score +
            0.2 * ml_certainty +
            0.2 * experience_factor
        )

        return confidence

    def _assess_image_quality(self, img_stats: Dict) -> float:
        """
        Analyse: blur, exposition, angle, reflets
        """
        blur_score = 1.0 if img_stats['sharpness'] > 80 else 0.5
        light_score = 1.0 if 40 < img_stats['brightness'] < 200 else 0.6
        angle_score = 1.0 if img_stats['perspective_skew'] < 5 else 0.7

        return (blur_score + light_score + angle_score) / 3
```

### 3.4 Intégration Hybrid Grader

```python
# inference/hybrid_grader.py

class HybridGrader:
    """
    Combine Rule-Based + ML Correction
    """

    def __init__(self, correction_model_path: str = None):
        self.rule_grader = RuleBasedGrader()
        self.ml_model = None
        self.confidence_calc = ConfidenceCalculator()

        # Charger ML model si disponible
        if correction_model_path and os.path.exists(correction_model_path):
            self.ml_model = keras.models.load_model(correction_model_path)

    def grade_card(self, front_img: np.ndarray, back_img: np.ndarray) -> Dict:
        # 1. Scoring rule-based
        rule_result = self.rule_grader.grade_card(front_img, back_img)

        # 2. Si ML model disponible, appliquer corrections
        if self.ml_model is not None:
            ml_corrections = self._apply_ml_corrections(
                front_img,
                rule_result['scores']
            )
            corrected_scores = self._apply_deltas(
                rule_result['scores'],
                ml_corrections
            )
        else:
            corrected_scores = rule_result['scores']
            ml_corrections = [0, 0, 0, 0, 0]

        # 3. Calculer confiance
        confidence = self.confidence_calc.calculate_confidence(
            image_quality=self._analyze_image_quality(front_img),
            rule_based_consistency=rule_result,
            ml_prediction_variance=np.var(ml_corrections),
            user_feedback_count=self._get_feedback_count()
        )

        return {
            'final_grade': min(s['score'] for s in corrected_scores.values()),
            'grade_label': self._get_grade_label(...),
            'scores': corrected_scores,
            'rule_based_scores': rule_result['scores'],
            'ml_corrections': ml_corrections,
            'confidence': confidence,
            'method': 'hybrid_v1'
        }
```

---

## 4. Phase 3 - Card Recognition & Pricing API

### 4.1 Reconnaissance de carte (OCR + Vision)

**Objectif**: Identifier automatiquement la carte (nom, set, numéro) depuis la photo

**Approche PokeScope (95%+ accuracy)**:
1. **CLIP embeddings** pour similarité visuelle globale
2. **OCR Tesseract** pour extraire le numéro de carte (coin inférieur)
3. **Hybrid verification**: CLIP trouve top 10 candidates, OCR confirme

```python
# inference/card_recognizer.py

import pytesseract
from PIL import Image
import clip
import torch

class CardRecognizer:
    """
    Identifie la carte pour récupérer les prix
    """

    def __init__(self):
        # CLIP model pour similarité visuelle
        self.clip_model, self.clip_preprocess = clip.load("ViT-B/32")

        # Database de cartes connues (embeddings précalculés)
        self.card_database = self._load_card_database()

    def identify_card(self, card_image: np.ndarray) -> Dict:
        """
        Pipeline:
        1. OCR sur coin inférieur pour set number (ex: "025/165")
        2. CLIP embedding pour trouver cartes visuellement similaires
        3. Match combiné
        """
        # 1. OCR du numéro
        card_number = self._extract_card_number_ocr(card_image)

        # 2. CLIP similarity
        image_pil = Image.fromarray(cv2.cvtColor(card_image, cv2.COLOR_BGR2RGB))
        image_input = self.clip_preprocess(image_pil).unsqueeze(0)

        with torch.no_grad():
            image_features = self.clip_model.encode_image(image_input)
            image_features /= image_features.norm(dim=-1, keepdim=True)

        # Similarité cosine avec database
        similarities = (image_features @ self.card_database['embeddings'].T).squeeze(0)
        top_10_indices = similarities.topk(10).indices

        # 3. Filter par numéro OCR si disponible
        if card_number:
            for idx in top_10_indices:
                if self.card_database['cards'][idx]['number'] == card_number:
                    return self.card_database['cards'][idx]

        # Sinon, retourner le plus similaire
        best_match_idx = top_10_indices[0]
        return {
            **self.card_database['cards'][best_match_idx],
            'confidence': similarities[best_match_idx].item()
        }

    def _extract_card_number_ocr(self, card_image: np.ndarray) -> str:
        """
        OCR sur coin inférieur droit où se trouve le numéro
        Ex: "025/165" ou "SWSH045"
        """
        h, w = card_image.shape[:2]
        bottom_right_crop = card_image[int(h*0.85):h, int(w*0.7):w]

        # Preprocessing OCR
        gray = cv2.cvtColor(bottom_right_crop, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Tesseract
        text = pytesseract.image_to_string(thresh, config='--psm 6')

        # Regex pour extraire format "XXX/XXX"
        import re
        match = re.search(r'(\d+/\d+|[A-Z]+\d+)', text)
        return match.group(0) if match else None
```

### 4.2 Intégration APIs Pricing

**Sources identifiées**:

#### A. Cardmarket API (Europe)
- **Official API**: Restricted (Widget/Powersellers only)
- **CardMarket-API.com**: Tiers service
  - Free: 100 requests/day
  - Paid: Production rates
  - Pricing EU + US combiné
- **TCGdex API**: Pricing Cardmarket inclus (update daily)

#### B. TCGPlayer API (US/Global)
- **Official**: developer.tcgplayer.com
  - RESTful API
  - Pricing data access
  - Affiliate commissions
- **PokemonPriceTracker API**: Daily-updated TCGPlayer + PSA prices
- **JustTCG**: Alternative avec updates fréquents (multiple times/day)

#### C. Recommandation

```python
# inference/pricing_service.py

import requests
from typing import List, Dict
from datetime import datetime, timedelta

class PricingService:
    """
    Agrège les prix depuis plusieurs sources
    """

    def __init__(self):
        self.tcgdex_base_url = "https://api.tcgdex.net/v2/en"
        self.cardmarket_api_key = os.getenv("CARDMARKET_API_KEY")
        self.tcgplayer_api_key = os.getenv("TCGPLAYER_API_KEY")

        # Cache (15min) pour éviter rate limits
        self.cache = {}
        self.cache_duration = timedelta(minutes=15)

    def get_card_prices(
        self,
        card_name: str,
        set_name: str,
        card_number: str,
        estimated_grade: int
    ) -> Dict:
        """
        Récupère les prix depuis TCGPlayer + Cardmarket
        Ajuste selon le grade estimé
        """
        cache_key = f"{card_name}_{set_name}_{card_number}"

        # Check cache
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return self._adjust_prices_by_grade(cached_data, estimated_grade)

        # Fetch fresh data
        try:
            # TCGdex (gratuit, inclut Cardmarket + TCGPlayer)
            tcgdex_prices = self._fetch_tcgdex_prices(card_name, set_name, card_number)

            # Cache result
            self.cache[cache_key] = (tcgdex_prices, datetime.now())

            return self._adjust_prices_by_grade(tcgdex_prices, estimated_grade)

        except Exception as e:
            logger.error(f"Pricing fetch error: {e}")
            return {'error': 'Pricing unavailable'}

    def _fetch_tcgdex_prices(self, card_name, set_name, card_number) -> Dict:
        """
        TCGdex API call
        """
        # Search card
        search_url = f"{self.tcgdex_base_url}/cards/{card_number}"
        response = requests.get(search_url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            return {
                'cardmarket': {
                    'average': data.get('cardmarket', {}).get('averageSellPrice'),
                    'low': data.get('cardmarket', {}).get('lowPrice'),
                    'trend': data.get('cardmarket', {}).get('trendPrice'),
                    'updated': data.get('cardmarket', {}).get('updatedAt')
                },
                'tcgplayer': {
                    'market': data.get('tcgplayer', {}).get('prices', {}).get('normal', {}).get('market'),
                    'low': data.get('tcgplayer', {}).get('prices', {}).get('normal', {}).get('low'),
                    'mid': data.get('tcgplayer', {}).get('prices', {}).get('normal', {}).get('mid'),
                    'high': data.get('tcgplayer', {}).get('prices', {}).get('normal', {}).get('high'),
                }
            }
        else:
            raise Exception(f"TCGdex API error: {response.status_code}")

    def _adjust_prices_by_grade(self, raw_prices: Dict, grade: int) -> Dict:
        """
        Ajuste les prix selon le grade estimé
        Facteurs basés sur market data:
        - PSA 10 = 2-5x raw price
        - PSA 9 = 1.5-3x
        - PSA 8 = 1.2-1.8x
        - PSA 7 = 1.0-1.3x
        - ≤6 = 0.5-1.0x
        """
        grade_multipliers = {
            10: (2.0, 5.0),
            9: (1.5, 3.0),
            8: (1.2, 1.8),
            7: (1.0, 1.3),
            6: (0.7, 1.0),
        }

        multiplier_range = grade_multipliers.get(grade, (0.5, 0.8))

        # Apply to all prices
        adjusted = {}
        for market, prices in raw_prices.items():
            adjusted[market] = {}
            for price_type, value in prices.items():
                if isinstance(value, (int, float)):
                    adjusted[market][f"{price_type}_min"] = value * multiplier_range[0]
                    adjusted[market][f"{price_type}_max"] = value * multiplier_range[1]
                else:
                    adjusted[market][price_type] = value

        adjusted['estimated_grade'] = grade
        adjusted['disclaimer'] = "Prices adjusted by AI grade estimation. Actual graded prices may vary."

        return adjusted
```

---

## 5. Architecture Technique Globale

### 5.1 Stack Technique

```yaml
Backend ML Service (FastAPI):
  Language: Python 3.10+
  Framework: FastAPI
  ML/CV:
    - OpenCV 4.8+
    - TensorFlow 2.15+
    - Keras 3.x
    - pytesseract (OCR)
    - CLIP (card recognition)
  APIs:
    - requests (HTTP calls)
  Database:
    - PostgreSQL (feedback storage)
  Deployment:
    - Docker
    - Port: 8000

NestJS API:
  - Appelle FastAPI ML service via HTTP
  - Stocke résultats + feedbacks users
  - Expose endpoints pour web/mobile

Frontend (Next.js + Mobile):
  - Upload images
  - Affiche résultats grading
  - Interface correction feedback
  - Affiche prix estimés
```

### 5.2 Endpoints FastAPI ML Service

```python
# main.py (FastAPI)

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from typing import Optional

app = FastAPI(title="Card Grading ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # NestJS API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
hybrid_grader = HybridGrader(correction_model_path="models/correction_model_v1.h5")
card_recognizer = CardRecognizer()
pricing_service = PricingService()

@app.post("/api/v1/grade")
async def grade_card(
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...),
    include_pricing: bool = Form(False)
):
    """
    Endpoint principal de grading
    """
    # 1. Load images
    front_bytes = await front_image.read()
    back_bytes = await back_image.read()

    front_np = np.frombuffer(front_bytes, np.uint8)
    back_np = np.frombuffer(back_bytes, np.uint8)

    front_img = cv2.imdecode(front_np, cv2.IMREAD_COLOR)
    back_img = cv2.imdecode(back_np, cv2.IMREAD_COLOR)

    # 2. Grading
    grading_result = hybrid_grader.grade_card(front_img, back_img)

    # 3. Card recognition (optional)
    card_info = None
    pricing_info = None

    if include_pricing:
        card_info = card_recognizer.identify_card(front_img)

        if card_info and card_info.get('confidence', 0) > 0.7:
            pricing_info = pricing_service.get_card_prices(
                card_name=card_info['name'],
                set_name=card_info['set'],
                card_number=card_info['number'],
                estimated_grade=grading_result['final_grade']
            )

    return {
        'grading': grading_result,
        'card_identification': card_info,
        'pricing': pricing_info,
        'timestamp': datetime.now().isoformat(),
        'version': 'v1.0.0'
    }


@app.post("/api/v1/feedback")
async def submit_feedback(
    session_id: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...),
    rule_based_scores: str = Form(...),  # JSON string
    user_corrected_scores: str = Form(...)  # JSON string
):
    """
    Endpoint pour sauvegarder les corrections utilisateurs
    → Dataset d'entraînement ML
    """
    import json

    rule_scores = json.loads(rule_based_scores)
    user_scores = json.loads(user_corrected_scores)

    # Calculer deltas
    deltas = {
        'centering': user_scores['centering'] - rule_scores['centering'],
        'corners': user_scores['corners'] - rule_scores['corners'],
        'edges': user_scores['edges'] - rule_scores['edges'],
        'surface': user_scores['surface'] - rule_scores['surface'],
        'print_quality': user_scores['print_quality'] - rule_scores['print_quality']
    }

    # Save to database
    await save_feedback_to_db(
        session_id=session_id,
        front_image=await front_image.read(),
        back_image=await back_image.read(),
        rule_scores=rule_scores,
        user_scores=user_scores,
        deltas=deltas
    )

    return {'status': 'success', 'message': 'Feedback saved for training'}


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'ml_model_loaded': hybrid_grader.ml_model is not None,
        'feedback_count': await get_feedback_count_from_db()
    }


@app.post("/api/v1/retrain")
async def trigger_retraining():
    """
    Déclenche le réentraînement du modèle ML
    (À sécuriser - admin only)
    """
    feedback_count = await get_feedback_count_from_db()

    if feedback_count < 100:
        return {'status': 'skipped', 'reason': 'Not enough feedback (min 100)'}

    # Lancer training en background
    import subprocess
    subprocess.Popen(['python', 'training/train_correction_model.py'])

    return {
        'status': 'started',
        'feedback_count': feedback_count,
        'message': 'Retraining started in background'
    }
```

### 5.3 Intégration NestJS

```typescript
// apps/api/src/ml/ml.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class MlService {
  private readonly mlServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
  }

  async gradeCard(
    frontImageBuffer: Buffer,
    backImageBuffer: Buffer,
    includePricing: boolean = false,
  ): Promise<GradingResult> {
    try {
      const formData = new FormData();
      formData.append('front_image', frontImageBuffer, 'front.jpg');
      formData.append('back_image', backImageBuffer, 'back.jpg');
      formData.append('include_pricing', includePricing.toString());

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/grade`, formData, {
          headers: formData.getHeaders(),
          timeout: 30000,
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'ML service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async submitFeedback(
    sessionId: string,
    frontImage: Buffer,
    backImage: Buffer,
    ruleScores: ScoresDto,
    userScores: ScoresDto,
  ): Promise<void> {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('front_image', frontImage, 'front.jpg');
    formData.append('back_image', backImage, 'back.jpg');
    formData.append('rule_based_scores', JSON.stringify(ruleScores));
    formData.append('user_corrected_scores', JSON.stringify(userScores));

    await firstValueFrom(
      this.httpService.post(`${this.mlServiceUrl}/api/v1/feedback`, formData, {
        headers: formData.getHeaders(),
      }),
    );
  }
}
```

---

## 6. Roadmap par Phases

### Phase 1: Rule-Based MVP (2-3 semaines)

**Objectif**: Système fonctionnel sans ML

**Tâches**:
- [ ] Implémenter CardDetector (OpenCV)
  - Détection contours carte
  - Perspective transform
  - Extraction bordures, coins, arêtes
- [ ] Implémenter DefectDetector
  - Whitening detection
  - Scratch detection
  - Corner sharpness
- [ ] Implémenter RuleBasedGrader
  - Scoring centering
  - Scoring corners
  - Scoring edges
  - Scoring surface
  - Scoring print quality
- [ ] FastAPI service
  - Endpoint /grade
  - Docker setup
- [ ] Tests unitaires OpenCV
- [ ] Documentation règles métier

**Livrable**: API qui retourne des scores basés sur règles officielles

### Phase 2: Feedback Loop + Database (1-2 semaines)

**Objectif**: Collecter les corrections utilisateurs

**Tâches**:
- [ ] Endpoint /feedback FastAPI
- [ ] Base de données PostgreSQL
  - Table feedback_sessions
  - Stockage images + scores + deltas
- [ ] Interface correction NestJS
  - Endpoint PUT /sessions/:id/correct
- [ ] Interface correction Frontend
  - Sliders par critère
  - Sauvegarde corrections

**Livrable**: Système qui stocke les corrections → dataset ML

### Phase 3: ML Correction Model (2-3 semaines)

**Objectif**: Modèle qui apprend des feedbacks

**Tâches**:
- [ ] Script training/train_correction_model.py
  - Chargement dataset feedbacks
  - Feature extraction (EfficientNet)
  - Training correction model
- [ ] Script export vers TF SavedModel
- [ ] Intégration HybridGrader
  - Chargement modèle
  - Application corrections
- [ ] Endpoint /retrain
- [ ] Monitoring métriques (MAE, variance)

**Livrable**: Modèle qui s'améliore avec les feedbacks

**Condition**: Minimum 100-200 feedbacks utilisateurs

### Phase 4: Card Recognition (2 semaines)

**Objectif**: Identifier automatiquement les cartes

**Tâches**:
- [ ] Setup CLIP model
- [ ] Database cartes Pokémon (embeddings)
  - Scraper Pokémon TCG Database
  - Précalcul embeddings
- [ ] OCR numéro de carte (Tesseract)
- [ ] CardRecognizer implementation
- [ ] Tests accuracy (target 90%+)

**Livrable**: API retourne {name, set, number, confidence}

### Phase 5: Pricing Integration (1 semaine)

**Objectif**: Afficher fourchette de prix

**Tâches**:
- [ ] Setup TCGdex API (gratuit)
- [ ] Alternative: TCGPlayer API (si besoin)
- [ ] PricingService implementation
- [ ] Cache 15min pour éviter rate limits
- [ ] Ajustement prix par grade
- [ ] Frontend display pricing

**Livrable**: Estimation prix selon grade

### Phase 6: Optimisation & Production (2 semaines)

**Tâches**:
- [ ] Optimisation performance OpenCV
- [ ] Batch processing
- [ ] Monitoring Sentry
- [ ] CI/CD GitHub Actions
- [ ] Documentation complète
- [ ] Tests end-to-end

---

## 7. Comparaison Approches

| Critère | Pure ML (plan actuel) | Hybrid Rule-Based + ML |
|---------|----------------------|------------------------|
| **Dataset initial** | 10k+ images annotées | 0 (règles codées) |
| **Coût démarrage** | Élevé (annotation) | Faible |
| **Time to MVP** | 6-8 semaines | 2-3 semaines |
| **Précision initiale** | Faible (besoin training) | Moyenne-Haute (règles officielles) |
| **Précision finale** | Très haute (si dataset qualité) | Haute (s'améliore avec feedback) |
| **Explicabilité** | Faible (boîte noire) | Haute (règles + corrections) |
| **Maintenance** | Réentraînement complexe | Incrémental (feedback continu) |
| **Confiance utilisateur** | Faible (incompréhensible) | Haute (peut voir les règles) |
| **Adaptabilité** | Difficile (retrain complet) | Facile (ajuster règles + ML) |

**Recommandation**: Hybrid approach pour ce projet car:
1. Budget limité (pas de grading officiel pour dataset)
2. Besoin MVP rapide
3. Utilisateurs veulent comprendre les scores
4. Amélioration continue via feedback gratuit

---

## 8. APIs Pricing - Détails d'implémentation

### 8.1 TCGdex API (Recommandé - Gratuit)

```bash
# Pas d'auth requise
curl https://api.tcgdex.net/v2/en/cards/swsh1-25
```

**Avantages**:
- Gratuit, pas de rate limit strict
- Inclut Cardmarket + TCGPlayer
- Update quotidien (Cardmarket) / horaire (TCGPlayer)
- Pas d'API key nécessaire

**Inconvénient**:
- Moins fréquent que temps réel

### 8.2 CardMarket-API.com (Fallback)

```python
# Nécessite API key
headers = {'Authorization': f'Bearer {CARDMARKET_API_KEY}'}
response = requests.get(
    'https://cardmarket-api.com/api/v1/price',
    params={'card_id': 'swsh1-25'},
    headers=headers
)
```

**Avantages**:
- EU + US pricing combiné
- Free tier: 100 req/day

**Inconvénient**:
- Coût au-delà du free tier

### 8.3 Stratégie Recommandée

```python
class PricingService:
    def get_prices(self, card_id):
        # 1. Try TCGdex (gratuit)
        try:
            return self._fetch_tcgdex(card_id)
        except:
            pass

        # 2. Fallback: CardMarket API
        try:
            return self._fetch_cardmarket_api(card_id)
        except:
            pass

        # 3. Last resort: cache / estimation
        return self._get_cached_or_estimate(card_id)
```

---

## 9. Métriques de Succès

**KPIs à tracker**:

1. **Précision grading**:
   - MAE (Mean Absolute Error) vs. corrections utilisateurs
   - Target: < 0.5 point d'écart moyen

2. **User engagement**:
   - % utilisateurs qui corrigent les scores
   - Target: > 30%

3. **Card recognition accuracy**:
   - % cartes correctement identifiées
   - Target: > 90%

4. **Performance**:
   - Temps réponse API < 3s
   - Uptime > 99%

5. **ML improvement**:
   - Réduction MAE au fil du temps
   - Target: -10% par 1000 feedbacks

---

## 10. Fichiers à créer

```
packages/ml/
├── preprocessing/
│   ├── __init__.py
│   ├── card_detector.py          # NEW: OpenCV detection
│   ├── defect_detector.py        # NEW: Defect analysis
│   └── image_quality.py          # NEW: Quality assessment
├── inference/
│   ├── rule_based_grader.py      # NEW: Rule engine
│   ├── hybrid_grader.py          # NEW: Rule + ML
│   ├── card_recognizer.py        # NEW: CLIP + OCR
│   ├── pricing_service.py        # NEW: API pricing
│   └── confidence_calculator.py  # NEW: Confidence scoring
├── training/
│   ├── train_correction_model.py # NEW: ML training
│   ├── data_loader.py            # NEW: Load feedbacks
│   └── model_architecture.py     # NEW: Correction model
├── configs/
│   ├── grading_rules.yaml        # NEW: Official rules
│   └── pricing_apis.yaml         # NEW: API configs
├── models/
│   ├── correction_model_v1.h5    # Generated by training
│   └── clip_card_embeddings.npy  # Card database
├── scripts/
│   ├── build_card_database.py    # NEW: Scrape + CLIP
│   └── evaluate_model.py         # NEW: Metrics
└── main.py                        # NEW: FastAPI service
```

---

## 11. Conclusion

**Avantages de cette approche**:

1. **MVP rapide**: 2-3 semaines vs. 6-8 semaines
2. **Coût réduit**: Pas besoin de grading officiel pour dataset initial
3. **Explicable**: Utilisateurs comprennent les scores
4. **Évolutif**: S'améliore automatiquement avec l'usage
5. **Complet**: Grading + reconnaissance + pricing en un seul système

**Prochaines étapes**:

1. Valider l'approche avec l'équipe
2. Commencer Phase 1 (Rule-Based MVP)
3. Setup FastAPI + Docker
4. Implémenter OpenCV pipeline

---

**Sources documentaires**:

- [Beckett Grading Standards](https://www.beckett.com/grading-standards)
- [CGC Cards Grading Scale](https://www.cgccards.com/card-grading/grading-scale/)
- [Card Centering Calculator](https://www.cardcenteringcalculator.com/grading-info)
- [PokeGrade Standards](https://pokegrade.org/grading-standards)
- [TCFever Grading Guide](https://tcfever.com/guides/grading)
- [Cardmarket API](http://cardmarket-api.com/)
- [TCGdex API Markets](https://tcgdex.dev/markets-prices)
- [TCGPlayer API Docs](https://docs.tcgplayer.com/docs/welcome)
- [Pokemon Card Recognizer GitHub](https://github.com/prateekt/pokemon-card-recognizer)
- [PokeScope AI Card Scanner](https://pokescope.app/blog/how-i-built-pokemon-card-scanner-ai-50000-users/)
- [Ximilar Collectibles Recognition API](https://docs.ximilar.com/collectibles/recognition)
