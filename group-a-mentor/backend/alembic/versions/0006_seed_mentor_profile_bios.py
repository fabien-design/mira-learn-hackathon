"""0006 — seed mentor_profile bios, headlines & social links

Revision ID: 0006a
Revises: 0005a
Create Date: 2026-05-14
"""
from alembic import op

revision = "0006a"
down_revision = "0005a"
branch_labels = None
depends_on = None


SEED_SQL = r"""
UPDATE mentor_profile SET
    headline   = 'Entrepreneur & angel investor — 3 exits, 200+ pitches déchiffrés',
    bio        = E'Après 12 ans à construire et revendre des startups B2B en Europe, j''ai rejoint l''écosystème en tant qu''investisseur angel et formateur.\n\nJe travaille avec des fondateurs early-stage pour transformer une idée floue en pitch qui convainc — en 45 minutes ou en 6 mois, selon là où tu en es.\n\nMa méthode : partir du problème client, pas du deck. On reconstruit la narration ensemble, slide par slide, jusqu''à ce que tu puisses la défendre les yeux fermés face à un jury hostile.',
    linkedin_url  = 'https://www.linkedin.com/in/antoine-martin-ventures',
    instagram_url = 'https://www.instagram.com/antoinemartin.vc',
    website_url   = NULL
WHERE id = '22222222-0001-0000-0000-000000000001';

UPDATE mentor_profile SET
    headline   = 'Product designer senior — ex-Figma Europe, aujourd''hui nomade & consultante',
    bio        = E'J''ai passé 7 ans dans le design de produit, dont 4 chez Figma à former des équipes design en EMEA.\n\nDepuis 2023, je travaille en freelance depuis Lisbonne, Tbilissi ou Chiang Mai selon la saison — et j''accompagne des designers et des PMs qui veulent passer au niveau supérieur.\n\nCe qui m''intéresse : la rigueur des systèmes de design, la communication avec l''ingénierie, et la façon dont on prend (et justifie) de vraies décisions produit quand les ressources sont limitées.',
    linkedin_url  = 'https://www.linkedin.com/in/marie-dupont-design',
    instagram_url = NULL,
    website_url   = 'https://mariedupont.design'
WHERE id = '22222222-0001-0000-0000-000000000002';

UPDATE mentor_profile SET
    headline   = 'CFO fractionnaire & expert levée de fonds — 40 M€ accompagnés en seed & série A',
    bio        = E'J''ai commencé comme analyste VC avant de rejoindre le côté fondateur — deux fois. La deuxième aventure s''est terminée par une acquisition, ce qui m''a appris autant sur la sortie que sur la levée.\n\nAujourd''hui CFO fractionnaire, j''aide des startups à préparer leur data room, modéliser leur unit economics et négocier des term sheets sans laisser de valeur sur la table.\n\nJe suis direct, j''aime les chiffres et je déteste les decks de 40 slides. Si tu veux du coaching confort, je ne suis pas le bon mentor. Si tu veux avancer vite, on s''entend bien.',
    linkedin_url  = 'https://www.linkedin.com/in/david-cohen-cfo',
    instagram_url = NULL,
    website_url   = 'https://davidcohen.io'
WHERE id = '22222222-0001-0000-0000-000000000003';

UPDATE mentor_profile SET
    headline   = 'Coach prise de parole & storytelling — ancienne journaliste, ex-TED speaker coach',
    bio        = E'Journaliste pendant 8 ans (Le Monde, Arte), puis coach communication pour des dirigeants et des speakers TEDx, j''ai appris à déconstruire ce qui rend une prise de parole mémorable.\n\nMon terrain de jeu : les personnes brillantes qui disparaissent dès qu''elles passent en mode "présentation". On travaille la structure, le rythme, la présence — mais surtout le point de vue unique que tu as et que tu n''oses pas encore affirmer.\n\nJe travaille en français et en anglais, en présentiel ou à distance.',
    linkedin_url  = 'https://www.linkedin.com/in/sophie-bernard-coach',
    instagram_url = 'https://www.instagram.com/sophiebernard.coach',
    website_url   = NULL
WHERE id = '22222222-0001-0000-0000-000000000004';

UPDATE mentor_profile SET
    headline   = 'Growth marketer & créateur de contenu — 0 à 80k abonnés en 18 mois',
    bio        = E'Parti de zéro avec un blog sur le nomadisme digital en 2022, j''ai construit une audience de 80 000 personnes en 18 mois en combinant contenu long-format, newsletters et collaborations stratégiques.\n\nDerrière les chiffres : beaucoup de tests, quelques erreurs coûteuses, et une obsession pour ce qui retient vraiment l''attention en 2024.\n\nJ''accompagne des créateurs et des indépendants qui veulent transformer leur expertise en audience — sans danser sur TikTok si ce n''est pas leur truc.',
    linkedin_url  = NULL,
    instagram_url = 'https://www.instagram.com/lucasgarcia.nomade',
    website_url   = 'https://lucasgarcia.co'
WHERE id = '22222222-0001-0000-0000-000000000005';
"""


def _split_statements(sql: str) -> list[str]:
    import re
    sql = re.sub(r'--[^\n]*', '', sql)
    return [p.strip() for p in sql.split(';') if p.strip()]


def upgrade() -> None:
    for stmt in _split_statements(SEED_SQL):
        op.execute(stmt)


def downgrade() -> None:
    op.execute("""
        UPDATE mentor_profile
        SET headline = '', bio = '', linkedin_url = NULL, instagram_url = NULL, website_url = NULL
        WHERE id IN (
            '22222222-0001-0000-0000-000000000001',
            '22222222-0001-0000-0000-000000000002',
            '22222222-0001-0000-0000-000000000003',
            '22222222-0001-0000-0000-000000000004',
            '22222222-0001-0000-0000-000000000005'
        )
    """)
