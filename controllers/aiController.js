const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({});

exports.getWorkoutRecommendation = async (req, res) => {
  try {
    const { currentWeeklyHours, targetedGoalHours, preferredActivityType } = req.body;

    // structural validation guardrail
    if (currentWeeklyHours === undefined || !targetedGoalHours) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing parameters: currentWeeklyHours and targetedGoalHours are required." 
      });
    }

    // AI prompt
    const prompt = `
      You are the backend AI engine for Fitly, a smart fitness tracking application.
      Analyze the user's weekly exercise metrics:
      - Total Hours Exercised So Far This Week: ${currentWeeklyHours} hours
      - Target Weekly Goal: ${targetedGoalHours} hours
      - Preferred Exercise Category: ${preferredActivityType}

      Generate a highly tailored workout prescription. You MUST return a flat JSON object matching this exact schema layout. Do not include markdown formatting, backticks, or any conversational text outside the JSON:
      {
        "strategy": "A short 2-4 word title for their weekly progress status phase (e.g., Catch-Up Urgency, Streak Maintenance, Recovery Reset)",
        "suggestedActivity": "A specific exercise routine matching their preferred type",
        "recommendedDurationMinutes": 45,
        "intensityLevel": "Low, Moderate, or High",
        "personalizedAdvice": "A supportive, 2-sentence coaching tip addressing how far they are from their weekly target hours."
      }
    `;

    // fire request to the live Gemini cloud model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        responseMimeType: "application/json" 
      }
    });

    // safely parse the real-time string returned by the model
    const aiRecommendation = JSON.parse(response.text);

    return res.status(200).json({
      success: true,
      message: "Smart recommendation processed successfully via Gemini!",
      recommendation: aiRecommendation
    });

  } catch (error) {
    console.error("Gemini Engine Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "AI Engine processing fault: " + error.message 
    });
  }
};