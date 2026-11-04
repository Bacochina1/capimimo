import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).with_name('testar_nvidia.py')
spec = importlib.util.spec_from_file_location('prototype', path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class RetrievalTest(unittest.TestCase):
    def test_price_and_safety(self):
        result = mod.retrieve('Quanto custa o plano cartão?')
        self.assertIn('14,90', result)
        self.assertIn('Limites de resposta', result)
    def test_account_and_safety(self):
        result = mod.retrieve('Como recuperar acesso pela conta?')
        self.assertIn('Minha conta', result)
        self.assertIn('Limites de resposta', result)
    def test_no_overlap_does_not_return_unrelated_price(self):
        result = mod.retrieve('xilofonexyz')
        self.assertNotIn('14,90', result)
        self.assertIn('Limites de resposta', result)
    def test_accent_normalization(self):
        self.assertEqual(mod.terms('Crédito'), mod.terms('credito'))

if __name__ == '__main__': unittest.main()
