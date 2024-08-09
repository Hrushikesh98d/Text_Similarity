'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const { Engine } = require('json-rules-engine');

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
    console.log('Calculated Similarity:', similarity); // Log similarity calculation
    return similarity >= jsonValue;
  });

  // Rule to detect high similarity (80% or above)
  const highSimilarityRule = {
    conditions: {
      all: [
        {
          fact: 'texts',
          operator: 'textSimilarity',
          value: 80
        }
      ]
    },
    event: {
      type: 'highSimilarity'
    }
  };
  engine.addRule(highSimilarityRule);

  // Rule to detect low similarity (below 80%)
  const lowSimilarityRule = {
    conditions: {
      all: [
        {
          fact: 'texts',
          operator: 'textSimilarity',
          value: 80,
          inverted: true // This will trigger if similarity is below 80%
        }
      ]
    },
    event: {
      type: 'lowSimilarity'
    }
  };
  engine.addRule(lowSimilarityRule);

  // Messages to return based on the similarity event
  const printEventType = {
    highSimilarity: 'The texts are similar',
    lowSimilarity: 'The texts are not similar'
  };

  // Endpoint to check text similarity
  app.post('/check-similarity', async (req, res) => {
    const { text1, text2 } = req.body;
    console.log('Received texts:', { text1, text2 }); // Log received texts

    const facts = { texts: { text1, text2 } };

    try {
      // Run the rules engine with the given facts
      const results = await engine.run(facts);
      console.log('Rules Engine Results:', results); // Log results from the engine

      // Determine the message based on the triggered event
      const eventType = results.events.length > 0
        ? results.events[0].type
        : 'noMatch';
      const message = printEventType[eventType] || 'No specific message';
      console.log('Determined message:', message); // Log determined message

      const similarity = calculateSimilarity(text1, text2);
      console.log('Similarity:', similarity); // Log similarity

      res.json({ similarity, message });
    } catch (error) {
      console.error('Error:', error.message); // Log errors
      res.status(500).json({ error: error.message });
    }
  });

  // Function to calculate the similarity between two texts
  function calculateSimilarity(text1, text2) {
    const lowerText1 = text1.toLowerCase();
    const lowerText2 = text2.toLowerCase();

    const words1 = lowerText1.split(' ');
    const words2 = lowerText2.split(' ');

    const intersection = words1.filter(word => words2.includes(word)).length;
    const union = new Set([...words1, ...words2]).size;

    return (intersection / union) * 100;
  }

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Initialize the server
start();
