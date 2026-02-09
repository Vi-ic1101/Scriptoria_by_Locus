import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Add server directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from utils.validators import validate_story_input
from utils.response_cleaner import clean_ai_response

class TestScriptoriaBackend(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_validators(self):
        # Valid input
        valid, msg = validate_story_input({"story": "A test story"})
        self.assertTrue(valid)
        
        # Invalid input (empty)
        valid, msg = validate_story_input({})
        self.assertFalse(valid)
        self.assertEqual(msg, "No input data provided.")

        # Invalid input (story too long)
        valid, msg = validate_story_input({"story": "a" * 1001})
        self.assertFalse(valid)
        self.assertIn("too long", msg)

    def test_cleaner(self):
        raw_text = "Here is the screenplay:\n\nINT. ROOM - DAY\n\nAction."
        cleaned = clean_ai_response(raw_text)
        self.assertNotIn("Here is the screenplay", cleaned)
        self.assertIn("INT. ROOM - DAY", cleaned)
        
        markdown_text = "```markdown\nINT. SCENE\n```"
        cleaned = clean_ai_response(markdown_text)
        self.assertEqual(cleaned, "INT. SCENE")

    @patch('app.generate_story_content')
    def test_generate_content_endpoint(self, mock_generate):
        # Mock successful generation
        mock_generate.return_value = {
            "screenplay": "INT. LAB - DAY\nA scientist works.",
            "characters": "Dr. Smith: A genius.",
            "sound_design": "Scene 1: Beeping noises.",
            "meta": {"status": "success"}
        }

        payload = {"story": "Scientist in a lab"}
        response = self.app.post('/generate-content', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(data['screenplay'], "INT. LAB - DAY\nA scientist works.")
        self.assertEqual(data['meta']['status'], "success")

    def test_set_username(self):
        response = self.app.post('/set-username', 
                                 data=json.dumps({"username": "TestUser"}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        with self.app.session_transaction() as sess:
            self.assertEqual(sess['username'], "TestUser")

if __name__ == '__main__':
    unittest.main()
