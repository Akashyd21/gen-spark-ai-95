export class PromptBuilder {
  constructor() {
    this.maxDescriptionLength = 500;
    this.minDescriptionLength = 100;
  }

  buildPrompt({
    productName,
    category,
    keyFeatures,
    targetAudience,
    tone,
    imageAnalysis
  }) {
    let prompt = `You are an expert e-commerce copywriter specializing in creating high-converting, SEO-optimized product descriptions.

Create a compelling product description with the following specifications:

📦 PRODUCT INFORMATION:
- Product Name: ${productName}
${category ? `- Category: ${category}` : ''}
- Key Features: ${keyFeatures}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
- Tone: ${tone || 'professional'}

${imageAnalysis ? this.buildImageContext(imageAnalysis) : ''}

📝 REQUIREMENTS:
1. Create a persuasive, engaging product description
2. Include SEO-optimized keywords naturally
3. Highlight unique selling points (USPs)
4. Use the specified tone throughout
5. Include a call-to-action
6. Keep description between 100-200 words
7. Format with clear sections
8. Include emotional appeal to target audience

⚡ TONE GUIDELINES:
${this.getToneGuidelines(tone)}

IMPORTANT: Return ONLY the product description, no additional commentary.`;

    return prompt;
  }

  buildImageContext(imageAnalysis) {
    return `📸 VISUAL ANALYSIS:
- Image Dimensions: ${imageAnalysis.dimensions.width}x${imageAnalysis.dimensions.height}
- Visual Style: ${imageAnalysis.description}
- Dominant Colors: ${imageAnalysis.dominantColors.join(', ')}
- Image Brightness: ${imageAnalysis.brightness}

Use visual cues from the image to enhance the product description. Reference visual aspects that make the product appealing.`;
  }

  getToneGuidelines(tone) {
    const toneGuides = {
      professional: `
    - Use formal, business-appropriate language
    - Focus on quality, reliability, and professionalism
    - Include technical specifications and expertise`,
      friendly: `
    - Use conversational, approachable language
    - Add personality and warmth
    - Use casual contractions and relatable phrases`,
      luxury: `
    - Use elegant, sophisticated language
    - Emphasize premium quality and exclusivity
    - Reference prestige and high-end appeal`,
      playful: `
    - Use fun, witty, and creative language
    - Include humor and playful descriptions
    - Appeal to creativity and imagination`,
      technical: `
    - Use precise, detailed technical language
    - Include specifications and performance metrics
    - Focus on functionality and capabilities`,
      minimalist: `
    - Use clean, concise language
    - Eliminate unnecessary words
    - Focus on essential features only`,
      inspirational: `
    - Use motivational and aspirational language
    - Appeal to dreams and goals
    - Focus on transformation and impact`
    };

    return toneGuides[tone] || toneGuides.professional;
  }

  validateInputs(data) {
    const errors = [];

    if (!data.productName || data.productName.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!data.keyFeatures || data.keyFeatures.trim().length === 0) {
      errors.push('Key features are required');
    }

    if (data.productName && data.productName.length > 100) {
      errors.push('Product name must be less than 100 characters');
    }

    if (data.keyFeatures && data.keyFeatures.length > 500) {
      errors.push('Key features must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  buildBulkPrompt(products) {
    return products.map(product => this.buildPrompt(product)).join('\n\n---\n\n');
  }

  buildCustomPrompt(template, variables) {
    let customPrompt = template;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      customPrompt = customPrompt.replace(regex, variables[key]);
    });

    return customPrompt;
  }
}