import sys, os, json, asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

AGENTS = {
    "FactChecker": {
        "prompt": (
            'Tu es un fact-checker. Évalue cette réponse : "Le tri rapide est O(n log n)".\n'
            "Réponds UNIQUEMENT en JSON valide avec exactement ces champs :\n"
            '{"verdict": "CORRECT", "confidence": 0.95, "explanation": "...", '
            '"matched_concepts": [], "misconceptions_detected": []}'
        ),
        "required_keys": ["verdict", "confidence", "explanation"]
    },
    "Grader": {
        "prompt": (
            "Tu es un grader pédagogique. Mets à jour le score après une bonne réponse.\n"
            "Réponds UNIQUEMENT en JSON valide avec exactement ces champs :\n"
            '{"factual_accuracy": 20, "depth_of_understanding": 18, '
            '"critical_reasoning": 15, "communication_clarity": 17, '
            '"total": 70, "bloom_level": "Understand"}'
        ),
        "required_keys": ["factual_accuracy", "total", "bloom_level"]
    },
    "PedagogicalAgent": {
        "prompt": (
            "Tu es un agent pédagogique. L'étudiant maîtrise le niveau Understand.\n"
            "Réponds UNIQUEMENT en JSON valide avec exactement ces champs :\n"
            '{"bloom_level": "Understand", "strategy": "deepen", '
            '"recurring_misconceptions": [], "next_focus": "complexité pire cas"}'
        ),
        "required_keys": ["bloom_level", "strategy"]
    },
    "Interrogator": {
        "prompt": (
            "Tu es un examinateur socratique. L'étudiant sait que le tri rapide est O(n log n).\n"
            "Pose UNE question ouverte pour approfondir. Maximum 200 caractères.\n"
            "Réponds avec juste la question, pas de JSON."
        ),
        "required_keys": None   # texte libre
    }
}


def clean_json(content: str) -> str:
    """Enlève les balises ```json ... ``` si présentes."""
    if "```" in content:
        parts = content.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                json.loads(part)
                return part
            except json.JSONDecodeError:
                continue
    return content.strip()


async def test_agent(name: str, config: dict) -> bool:
    print(f"\n  [{name}]")
    try:
        response = llm.invoke(config["prompt"])
        content = response.content.strip()

        # Agent à sortie texte libre (Interrogator)
        if config["required_keys"] is None:
            print(f'    Réponse : "{content[:100]}"')
            if len(content) <= 250:
                print(f"    ✓ Longueur OK ({len(content)} chars)")
            else:
                print(f"    ⚠  Trop long ({len(content)} chars)")
            return True

        content = clean_json(content)
        data = json.loads(content)

        missing = [k for k in config["required_keys"] if k not in data]
        if missing:
            print(f"    ✗ Clés manquantes : {missing}")
            return False

        print("    JSON valide ✓")
        for key in config["required_keys"]:
            print(f"    {key} = {data[key]}")
        return True

    except json.JSONDecodeError as e:
        print(f"    ✗ JSON INVALIDE : {e}")
        print(f"    Réponse brute : {content[:200]}")
        print()
        print("    CORRECTION : ouvre le fichier de cet agent et ajoute en fin")
        print('    de son prompt système :')
        print('    "Réponds UNIQUEMENT en JSON valide, sans markdown,')
        print('     sans texte avant ni après."')
        return False
    except Exception as e:
        print(f"    ✗ Erreur inattendue : {e}")
        return False


async def main():
    print("=" * 55)
    print("  TEST JSON DES AGENTS — ora.IA")
    print("=" * 55)

    results = []
    for name, config in AGENTS.items():
        ok = await test_agent(name, config)
        results.append(ok)

    passed = sum(results)
    print(f"\n{'='*55}")
    print(f"  Résultat : {passed}/{len(results)} agents OK")
    if passed == len(results):
        print("  ✅ Tous les agents retournent du JSON valide")
        print("  → Lance test_agents.py pour le test complet")
    else:
        failed = [name for name, ok in zip(AGENTS.keys(), results) if not ok]
        print(f"  ⚠  Agents à corriger : {', '.join(failed)}")
    print("=" * 55)


asyncio.run(main())
