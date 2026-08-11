from pathlib import Path

path = Path("scripts/apply-questionnaire-semantic-flow-v3.py")
source = path.read_text()

diaper_needle = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
  },'''
diaper_replacement = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
    safetyNote: "Kies de juiste maat, voorkom schuren en controleer de huid. Vervang een natte of vervuilde luier tijdig en stop bij huidbeschadiging of aanhoudende irritatie.",
  },'''
count = source.count(diaper_needle)
if count != 2:
    raise RuntimeError(f"expected two diaper wearing transform fragments, got {count}")
source = source.replace(diaper_needle, diaper_replacement)

role_needle = r'''Voor \*\*sterk rol-geassocieerde\*\* pair.*?Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn\.'''
role_replacement = r'''Voor een \*\*sterk rol-geassocieerde\*\* pair.*?Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn\.'''
if source.count(role_needle) != 1:
    raise RuntimeError("expected one role-policy documentation regex")
source = source.replace(role_needle, role_replacement, 1)

path.write_text(source)
print("transform preconditions patched")
