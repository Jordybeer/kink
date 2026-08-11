from pathlib import Path

path = Path("scripts/apply-questionnaire-semantic-flow-v3.py")
source = path.read_text()
needle = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
  },'''
replacement = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
    safetyNote: "Kies de juiste maat, voorkom schuren en controleer de huid. Vervang een natte of vervuilde luier tijdig en stop bij huidbeschadiging of aanhoudende irritatie.",
  },'''
count = source.count(needle)
if count != 2:
    raise RuntimeError(f"expected two diaper wearing transform fragments, got {count}")
path.write_text(source.replace(needle, replacement))
print("transform precondition patched")
