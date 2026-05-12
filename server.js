import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';

import { ImageProcessor } from './src/services/imageProcessor.js';
import { PromptBuilder } from './src/services/promptBuilder.js';

dotenv.config();

const app = express();

/* =========================================================
   Path Setup
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   Middleware
========================================================= */

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

app.use(express.static(
  path.join(__dirname, 'public')
));

/* =========================================================
   File Upload Setup
========================================================= */

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: parseInt(
      process.env.MAX_IMAGE_SIZE || 5242880
    )
  },

  fileFilter: (req, file, cb) => {

    const allowedTypes = (
      process.env.ALLOWED_IMAGE_TYPES ||
      'jpeg,jpg,png,webp'
    ).split(',');

    const fileExt =
      file.mimetype.split('/')[1];

    if (allowedTypes.includes(fileExt)) {

      cb(null, true);

    } else {

      cb(
        new Error(
          `File type ${fileExt} not allowed`
        )
      );
    }
  }
});

/* =========================================================
   Services
========================================================= */

const imageProcessor = new ImageProcessor();

const promptBuilder = new PromptBuilder();

/* =========================================================
   OpenRouter AI Function
========================================================= */

async function generateWithAI(prompt) {

  const apiKey =
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {

    throw new Error(
      'OPENROUTER_API_KEY missing in .env'
    );
  }

  try {

    console.log(
      'Using OpenRouter AI...'
    );

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${apiKey}`,

          'Content-Type': 'application/json'
        },

        body: JSON.stringify({

         model:
    'openai/gpt-3.5-turbo',

  messages: [

    {
      role: 'system',

      content:
        'You are an expert ecommerce copywriter.'
    },

    {
      role: 'user',

      content: `
Generate a professional ecommerce product description.

${prompt}

IMPORTANT:
Return ONLY the product description.
      `
    }
  ],

  temperature: 0.7,

  max_tokens: 300
        })
      }
    );

    const data = await response.json();

    console.log('AI Response:', data);

    if (data.error) {

      throw new Error(
        data.error.message || 'AI Error'
      );
    }

    return data.choices[0]
      .message.content
      .trim();

  } catch (error) {

    console.error(
      'OpenRouter Error:',
      error.message
    );

    throw new Error(
      error.message || 'Generation failed'
    );
  }
}

/* =========================================================
   Home Route
========================================================= */

app.get('/', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

/* =========================================================
   Health Check
========================================================= */

app.get('/api/health', (req, res) => {

  res.json({

    status: 'ok',

    timestamp: new Date().toISOString(),

    llmProvider: 'openrouter',

    configured:
      !!process.env.OPENROUTER_API_KEY
  });
});

/* =========================================================
   Generate Product Description
========================================================= */

app.post(
  '/api/generate-description',

  upload.single('image'),

  async (req, res) => {

    try {

      const {

        productName,

        category,

        keyFeatures,

        targetAudience,

        tone

      } = req.body;

      if (
        !productName ||
        !keyFeatures
      ) {

        return res.status(400).json({

          success: false,

          error:
            'Product name and key features are required'
        });
      }

      /* =========================================
         Image Analysis
      ========================================= */

      let imageAnalysis = null;

      if (req.file) {

        try {

          imageAnalysis =
            await imageProcessor.analyzeImage(
              req.file.buffer
            );

        } catch (err) {

          console.warn(
            'Image analysis failed:',
            err.message
          );
        }
      }

      /* =========================================
         Prompt Builder
      ========================================= */

      const prompt =
        promptBuilder.buildPrompt({

          productName,

          category,

          keyFeatures,

          targetAudience,

          tone,

          imageAnalysis
        });

      console.log('Generated Prompt:');
      console.log(prompt);

      /* =========================================
         AI Generation
      ========================================= */

      const description =
        await generateWithAI(prompt);

      /* =========================================
         Send Response
      ========================================= */

      res.json({

        success: true,

        description,

        metadata: {

          timestamp:
            new Date().toISOString(),

          productName,

          category,

          tone,

          imageAnalyzed:
            !!imageAnalysis
        }
      });

    } catch (error) {

      console.error(
        'Generation Error:',
        error.message
      );

      res.status(500).json({

        success: false,

        error:
          error.message ||
          'Failed to generate description'
      });
    }
  }
);

/* =========================================================
   Models API
========================================================= */

app.get('/api/models', (req, res) => {

  res.json({

    success: true,

    models: [

      'meta-llama/llama-3-8b-instruct:free',

      'google/gemma-7b-it:free'
    ],

    configured:
      !!process.env.OPENROUTER_API_KEY
  });
});

/* =========================================================
   Providers API
========================================================= */

app.get('/api/providers', (req, res) => {

  res.json({

    success: true,

    providers: [

      {

        id: 'openrouter',

        name: 'OpenRouter',

        models: [

          'meta-llama/llama-3-8b-instruct:free',

          'google/gemma-7b-it:free'
        ]
      }
    ]
  });
});

/* =========================================================
   Error Handling
========================================================= */

app.use((err, req, res, next) => {

  console.error(
    'Server Error:',
    err
  );

  res.status(500).json({

    success: false,

    error:
      err.message ||
      'Internal server error'
  });
});

/* =========================================================
   404 Handler
========================================================= */

app.use((req, res) => {

  res.status(404).json({

    success: false,

    error: 'Route not found'
  });
});

/* =========================================================
   Start Server
========================================================= */

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`
╔══════════════════════════════════════════════╗
║           GenSpark AI Server v3             ║
╚══════════════════════════════════════════════╝

🚀 Server Running:
http://localhost:${PORT}

🤖 AI Provider:
OpenRouter

🔑 API Configured:
${!!process.env.OPENROUTER_API_KEY}

✨ Ready to Generate Product Descriptions
  `);
});