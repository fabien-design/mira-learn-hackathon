# mentor_cv_import

**Possédé par** : Group A (write)
**Reprenabilité post-hackathon** : migration vers `mentors-api.mentor_cv_import`

## Description fonctionnelle

Trace les imports de CV par un candidat mentor lors de sa candidature. Le candidat uploade un PDF (ou fournit une URL LinkedIn), l'IA (OpenRouter via wrapper `LLMClient.extract_skills_from_cv()`) extrait :
- Les expériences professionnelles (poste, entreprise, dates, descriptif)
- Les skills déduites du contenu

L'extraction est asynchrone : l'API retourne immédiatement avec status `extracting`, le job background appelle l'IA, met à jour le status à `extracted`. Le candidat valide ou ajuste les skills extraites avant de les valider (status `validated`).

## Schéma SQL

```sql
CREATE TABLE mentor_cv_import (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES mentor_application(id) ON DELETE CASCADE,

    -- Source du CV
    source_type VARCHAR(32) NOT NULL CHECK (source_type IN ('pdf', 'linkedin_url', 'manual_paste')),
    file_url VARCHAR(500) NULL,                            -- URL fichier dans Supabase Storage (si pdf)
    source_url VARCHAR(500) NULL,                          -- URL LinkedIn ou autre (si linkedin_url)
    raw_text TEXT NULL,                                    -- texte brut OCR/parse (si manual_paste ou intermédiaire)

    -- Lifecycle extraction
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded' CHECK (status IN (
        'uploaded', 'extracting', 'extracted', 'validated', 'failed'
    )),
    error_message TEXT NULL,                               -- raison de l'échec si status='failed'

    -- Résultats IA
    extracted_experiences_raw JSONB NULL,
        -- Schéma : [
        --   {"role": "Head of Growth", "company": "Acme", "start_year": 2022, "end_year": 2024, "description": "..."},
        --   ...
        -- ]
    extracted_skills_raw JSONB NULL,
        -- Schéma : [
        --   {"skill_slug": "pitch-investor", "level": "advanced", "confidence": 0.85, "evidence": "Pitch decks for ..."},
        --   ...
        -- ]

    -- Données validées par le candidat (après ajustement)
    validated_experiences JSONB NULL,                      -- même schéma que extracted_experiences_raw
    validated_skills JSONB NULL,                           -- même schéma que extracted_skills_raw

    -- Audit
    extracted_at TIMESTAMP WITH TIME ZONE NULL,            -- set quand status passe à 'extracted'
    validated_at TIMESTAMP WITH TIME ZONE NULL,            -- set quand status passe à 'validated'
    llm_model_used VARCHAR(64) NULL,                       -- ex 'anthropic/claude-3.5-sonnet'
    llm_tokens_consumed INTEGER NULL,                      -- audit coût OpenRouter

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_mentor_cv_import_application_id ON mentor_cv_import (application_id);
CREATE INDEX idx_mentor_cv_import_status ON mentor_cv_import (status) WHERE deleted_at IS NULL;
```

## Schéma Pydantic

```python
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

CVImportStatus = Literal["uploaded", "extracting", "extracted", "validated", "failed"]
CVSourceType = Literal["pdf", "linkedin_url", "manual_paste"]


class ExtractedExperience(BaseModel):
    role: str
    company: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    description: str = ""


class ExtractedSkill(BaseModel):
    skill_slug: str
    level: Literal["intermediate", "advanced", "expert"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: str = ""


class MentorCVImportCreate(BaseModel):
    source_type: CVSourceType
    file_url: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: Optional[str] = None


class MentorCVImportValidate(BaseModel):
    """Validation par le candidat des données extraites."""
    validated_experiences: list[ExtractedExperience]
    validated_skills: list[ExtractedSkill]


class MentorCVImportRead(BaseModel):
    id: str
    application_id: str
    source_type: CVSourceType
    status: CVImportStatus
    error_message: Optional[str]
    extracted_experiences_raw: Optional[list[ExtractedExperience]]
    extracted_skills_raw: Optional[list[ExtractedSkill]]
    validated_experiences: Optional[list[ExtractedExperience]]
    validated_skills: Optional[list[ExtractedSkill]]
    extracted_at: Optional[datetime]
    validated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

## Contraintes métier

- Au moins un de `file_url`/`source_url`/`raw_text` doit être renseigné (validation côté service)
- **Lifecycle async** :
  - `uploaded` → l'API retourne immédiatement, job background démarre
  - `extracting` → IA en cours (max 60s typique)
  - `extracted` → résultats IA disponibles, candidat doit valider
  - `validated` → candidat a confirmé les skills/expériences → injection automatique dans `mentor_application.bio` (concatène expériences) + `mentor_application_skill` (insère skills validées avec `validated_via_cv_import=TRUE`)
  - `failed` → IA a échoué (timeout, parse error, format non supporté), `error_message` documenté
- **Idempotency** : un candidat peut faire plusieurs imports (ex : PDF + LinkedIn) — chaque import a son propre lifecycle indépendant
- **RGPD hackathon** : les CV uploadés sont stockés en Supabase Storage avec accès restreint (RLS désactivé en hackathon, sécurisé par auth API uniquement)

## Relations

- **Référence** :
  - `application_id` → `mentor_application.id` (CASCADE)

## Routes API

```
POST   /v1/mentors/applications/me/cv-imports                   — uploader un CV (status='uploaded')
GET    /v1/mentors/applications/me/cv-imports                   — list mes imports
GET    /v1/mentors/applications/me/cv-imports/{id}              — détail (polling status)
PATCH  /v1/mentors/applications/me/cv-imports/{id}/validate     — valider les résultats (status extracted → validated)
DELETE /v1/mentors/applications/me/cv-imports/{id}              — soft delete
```

Internal (job background) :
```
POST   /internal/cv-imports/{id}/extract                         — appelé par job worker, fait l'appel IA et update
```

## Seed attendu

- 2-3 imports CV seedés au status `validated` (pour démontrer que la pipeline complète a marché)
- 1 import au status `extracted` (à valider manuellement par le candidat — pour démo UX)
- 1 import au status `failed` avec error_message documenté (démo error handling)

## Reprenabilité

**Mapping** : `mentors-api.mentor_cv_import` — schéma identique, migration directe.

**Transformations** :
1. Migrer le fichier Supabase Storage → `files-api` S3 OVH (1 endpoint d'upload de référence)
2. Remplacer l'appel `LLMClient.extract_skills_from_cv()` par HMAC vers `bots-api` avec tool `extract_cv_skills`
3. Ajouter audit log RGPD article 8.3.8 (droit à l'oubli sur les CV importés)

**Effort** : ~2-3h Claude Code.
