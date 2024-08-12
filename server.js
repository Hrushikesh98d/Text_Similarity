'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const { Engine } = require('json-rules-engine');
const levenshtein = require('fast-levenshtein');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(express.static('public'));

async function start() {
  // Create a new rules engine instance
  const engine = new Engine();

  // Define a custom operator 'textSimilarity' for the rules engine
  engine.addOperator('textSimilarity', (factValue, jsonValue) => {
    const similarity = calculateSimilarity(factValue.text1, factValue.text2);
    return similarity >= jsonValue;
  });

  // Single rule to handle both cases based on the similarity threshold
  const similarityRule = {
    conditions: {
      all: [
        {
          fact: 'texts',
          operator: 'textSimilarity',
          value: 80 // Similarity threshold
        }
      ]
    },
    event: {
      type: 'similarityCheck'
    }
  };
  engine.addRule(similarityRule);

  // Endpoint to check text similarity
  app.post('/check-similarity', async (req, res) => {
    const { text1, text2 } = req.body;

    const facts = { texts: { text1, text2 } };

    try {
      // Run the rules engine with the given facts
      await engine.run(facts);

      // Calculate similarity and determine the message
      const similarity = calculateSimilarity(text1, text2);
      let message = '';

      if (similarity >= 80) {
        message = 'The texts are similar';
      } else {
        message = 'The texts are not similar';
      }

      res.json({ similarity, message });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Function to calculate the similarity between two texts
  function calculateSimilarity(text1, text2) {
    // Normalize by removing extra whitespace and converting to lowercase
    const normalizedText1 = text1.trim().replace(/\s+/g, ' ').toLowerCase();
    const normalizedText2 = text2.trim().replace(/\s+/g, ' ').toLowerCase();

    // Calculate Levenshtein distance
    const distance = levenshtein.get(normalizedText1, normalizedText2);

    // Calculate the maximum possible length for normalization
    const maxLength = Math.max(normalizedText1.length, normalizedText2.length);

    // Calculate similarity percentage
    const similarity = ((maxLength - distance) / maxLength) * 100;
    return similarity;
  }

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Initialize the server
start();
