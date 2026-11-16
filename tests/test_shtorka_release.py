"""Guard the transition from interest by email to actual distribution and sales."""
import copy
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_shtorka import load_release, render, validate_release, view_model


class ShtorkaAcquisition(unittest.TestCase):
    def setUp(self):
        self.prelaunch = copy.deepcopy(load_release())
        self.prelaunch.update(mode='early-access', download_url=None, checkout_url=None, price=None, trial_days=None)
        # Fictional fixtures never enter the published release configuration.
        self.paid = dict(self.prelaunch, mode='released', version='1.0', minimum_macos='15', processors='Apple silicon', download_url='https://example.com/SHTORKA.dmg', checkout_url='https://example.com/checkout?a=1&b=2', price='29.00', currency='USD', billing='one-time', terms_url='https://example.com/terms')

    def test_early_access_is_an_email_enquiry_not_a_download_or_checkout(self):
        model = view_model(self.prelaunch)
        self.assertTrue(model['primary_url'].startswith('mailto:'))
        self.assertIn('only when you send', model['action_note'])
        self.assertEqual(model['secondary_action'], '')
        self.assertNotIn('data-secondary-action', render(self.prelaunch))
        for key in ['price', 'download_url', 'checkout_url', 'trial_days']:
            invalid = dict(self.prelaunch, **{key: self.paid.get(key) or 7})
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_release(invalid)

    def test_release_cannot_accidentally_publish_without_the_installer_and_compatibility(self):
        for key in ['download_url', 'minimum_macos', 'processors', 'version']:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_release(dict(self.paid, **{key: None}))

    def test_paid_without_trial_goes_to_checkout_and_keeps_a_download_for_customers(self):
        model = view_model(self.paid)
        self.assertEqual(model['primary_label'], 'Buy SHTORKA')
        self.assertEqual(model['primary_url'], self.paid['checkout_url'])
        self.assertIn(self.paid['download_url'], model['secondary_action'])
        self.assertIn('one-time payment', model['offer'])
        self.assertIn('29.00 USD · one-time payment', model['hero_note'])
        self.assertIn('checkout?a=1&amp;b=2', render(self.paid))

    def test_real_trial_starts_with_download_and_discloses_the_paid_option(self):
        model = view_model(dict(self.paid, trial_days=7, billing='monthly'))
        self.assertEqual(model['primary_url'], self.paid['download_url'])
        self.assertIn('29.00 USD', model['secondary_action'])
        self.assertIn('7-day trial', model['offer'])
        self.assertIn('billed monthly', model['offer'])
        self.assertIn('7-day trial · 29.00 USD · billed monthly', model['hero_note'])

    def test_invalid_purchase_configuration_is_rejected_before_build(self):
        for patch in [{'checkout_url': 'javascript:alert(1)'}, {'terms_url': None}, {'price': '-1'}, {'price': 'NaN'}, {'billing': None}, {'trial_days': 0}, {'trial_days': True}, {'download_url': 'http://example.com/SHTORKA.dmg'}]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                validate_release(dict(self.paid, **patch))


if __name__ == '__main__':
    unittest.main()
