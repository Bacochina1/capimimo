"""Protótipo local: use apenas perguntas fictícias e dados públicos."""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
MODEL = 'nvidia/nemotron-3-ultra-550b-a55b'
BASE = Path(__file__).with_name('base-publica.md')

def terms(value):
    value = unicodedata.normalize('NFKD', value.casefold())
    return set(re.findall(r'[a-z0-9]{3,}', ''.join(c for c in value if not unicodedata.combining(c))))

def retrieve(question):
    sections = re.split(r'(?m)^## ', BASE.read_text(encoding='utf-8'))[1:]
    safety = next((item for item in sections if item.startswith('Limites de resposta')), '')
    relevant = [item for item in sections if item != safety and terms(question) & terms(item)]
    ranked = sorted(relevant, key=lambda item: len(terms(question) & terms(item)), reverse=True)
    # Always retain the constraints; never fill the context with unrelated facts.
    selected = ranked[:3] + ([safety] if safety else [])
    return '\n\n'.join(selected)[:6000]

def main():
    key = os.environ.get('NVIDIA_API_KEY')
    if not key:
        print('Configure NVIDIA_API_KEY no ambiente antes de executar. Não inclua a chave no código.', file=sys.stderr)
        return 2
    question = ' '.join(sys.argv[1:]).strip()
    if not question or len(question) > 500:
        print('Informe uma pergunta fictícia com até 500 caracteres.', file=sys.stderr)
        return 2
    ideas = question.startswith('--ideias ')
    if ideas:
        question = question[len('--ideias '):].strip()
        if not question:
            print('Informe uma ocasião fictícia.', file=sys.stderr)
            return 2
        system = 'Você ajuda a criar presentes digitais. Escreva três sugestões breves e distintas em português brasileiro para a ocasião informada. Não invente nomes, fatos pessoais ou memórias. Não inclua preços. Não substitua texto existente; as sugestões devem ser revisadas pelo usuário.'
    else:
        context = retrieve(question)
        system = 'Você é assistente de testes do Capimimo. Responda em português, de forma curta, com base somente no contexto público. Se não souber, diga isso e indique bacochinakawai@gmail.com. Não confirme pagamentos, não solicite dados pessoais.\nContexto:\n' + context
    payload = {'model': MODEL, 'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': question}], 'temperature': 0.3, 'max_tokens': 512, 'stream': False, 'chat_template_kwargs': {'enable_thinking': False}}
    req = Request(API_URL, data=json.dumps(payload).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(req, timeout=60) as response:
            result = json.load(response)
        print(result['choices'][0]['message']['content'])
        return 0
    except (HTTPError, URLError, TimeoutError, KeyError, IndexError, ValueError) as exc:
        print('Não foi possível consultar o protótipo NVIDIA (' + type(exc).__name__ + '). Verifique a chave, os limites e a conexão.', file=sys.stderr)
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
