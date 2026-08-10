# Questionnaire metadata audit — canonical mapping @2

> Scope: actieve catalogus van 291 vragen op de gestapelde catalogus-v2-branch.
> Dit document beoordeelt uitsluitend volgorde en lokale vervolgvragen. Het
> wijzigt geen antwoord, compatibility-score, identiteit of perspective.

## Beslisregel

Een edge bestaat alleen wanneer deze zin zonder uitspraak over de gebruiker
waar blijft:

> Na vraag A is vraag B een concrete, zelfstandig antwoordbare inhoudelijke
> grens of voortzetting.

Dat A positief is, zegt niets over het antwoord op B. Ontbrekende metadata
betekent nul propagation. Topic en broad cluster zijn nooit fallback-edges.

## Topic-audit

Topics bewaken alleen gespreksspreiding. Deze audit voegt smalle spacing-groepen
toe voor media capture, masturbation, remote toys, sensory deprivation,
aftercare, breeding en diaper play.

Drie bewuste scheidingen:

- diaper play staat niet meer in `little_ageplay`;
- diaper wetting staat niet in `watersports`;
- `foot_focus` is een neutrale spacingnaam en creëert geen worship-relatie.

Dus een Golden Shower, Little headspace of algemene foot focus kan op basis van
een topic nooit een luier-, pet- of worshipvraag promoten.

## Canonical mapping @2

`QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 2` maakt de uitbreiding expliciet.
De elf mappings uit @1/PR #299 blijven ongewijzigd; @2 voegt alleen nieuwe
sources toe. Daarmee is dit een gereviewde semantische release, geen stille
metadataherschikking.

| Source | Canonical target | Waarom de vraag inhoudelijk volgt |
| --- | --- | --- |
| `spanking_hand` | `spanking_implement` | Dezelfde handeling met een expliciet ander middel |
| `rope_bondage` | `shibari` | Algemene touwbondage naar een specifieke touwpraktijk |
| `handcuffs` | `leather_cuffs` | Dezelfde restraintvorm met ander materiaal |
| `rules_protocols` | `rituelen_protocols` | Algemene protocollen naar herhaalde dagelijkse toepassing |
| `ochtend_avondritueel` | `rituelen_protocols` | Eén concreet ritueel naar een breder ritueelpatroon |
| `orgasm_control` | `orgasm_denial` | Algemene controle naar één expliciete vorm |
| `exhibitionism` | `being_watched` | Algemeen begrip naar de concrete ervaring van bekeken worden |
| `voyeurism` | `watching_others` | Algemeen begrip naar expliciet in-person kijken |
| `watersports_geven` | `watersports_ontvangen` | De andere expliciete kant van dezelfde handeling |
| `geur_scent_fetish` | `panty_sniffing` | Algemene scent focus naar één concrete bron |
| `petplay_puppy` | `petplay_harnas` | Puppyplay naar een concrete puppyplay-prop |
| `watersports_ontvangen` | `urine_intiem` | Huidcontact naar de afzonderlijke mond-/ingestiegrens; alleen voorwaarts |
| `shibari` | `suspension_rechtop` | De catalogusdefinitie benoemt suspension expliciet als aparte vervolgstap |
| `blindfold` | `sound_deprivation` | Eén beperkt zintuig naar een tweede, zelfstandig te beantwoorden zintuig |
| `being_watched` | `public_play` | Bekeken worden naar de aparte publieke-contextgrens |
| `remote_toy` | `remote_toy_publiek` | Privé/afgesproken remote play naar de aparte publieke-contextgrens |
| `nude_photography` | `recording` | Naaktfoto naar de afzonderlijke grens van seksuele privé-opname |
| `recording` | `adult_content_creation` | Privé-opname naar de afzonderlijke publicatie-/publieksintentie |
| `partner_masturbation_watch` | `mutual_masturbation` | Kijken naar de aparte grens van gelijktijdig zelf aanraken |
| `anal_fingering` | `anal_sex` | Verkennende vingerpenetratie naar de afzonderlijke penetratiegrens |
| `luiers_dragen` | `diaper_wetting` | Dragen naar daadwerkelijk nat gebruiken, zonder ageplay te veronderstellen |
| `diaper_wetting` | `diaper_changing` | Nat gebruik naar de aparte verzorgings-/wisselhandeling |
| `diaper_messing` | `diaper_changing` | Bevuild gebruik naar dezelfde aparte verzorgings-/wisselhandeling |
| `breeding_fantasy` | `creampie` | Fantasie naar de expliciet afgesplitste fysieke handeling |

Een target dat al beantwoord is verbruikt de source zonder fallback. Wetting en
messing mogen hetzelfde changing-target nomineren, maar leveren samen één probe
met twee provenance-redenen op.

## Expliciet verworpen propagaties

Deze inhoud kan via gewone discovery alsnog verschijnen, maar krijgt geen edge:

- Golden Shower + Trampling → humiliation;
- Golden Shower ↔ diaper wetting;
- urine ingestion hard limit → Golden Shower onderdrukken;
- Little/ageplay ↔ Pet Play;
- foot focus → worship;
- pregnancy attraction → breeding fantasy;
- smeared makeup → tears;
- vampire fangs → biting;
- perspective → geven/ontvangen of voorkeur.

De reden is steeds dezelfde: de combinatie kan cultureel herkenbaar zijn, maar
vertelt niets noodzakelijks over de persoon of diens volgende antwoord.

## Wijzigingsregel

Een bestaande canonical source opnieuw richten of verwijderen is een
semantische datamigratie. Ook nieuwe mappings landen uitsluitend via een
inhoudelijke edge-audit en een expliciete versiereview. Een metadatafout geeft
geen fallback naar een tweede target.
