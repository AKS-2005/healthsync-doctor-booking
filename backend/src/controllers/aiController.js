const aiService = require('../services/aiService');

class AiController {
  /**
   * POST /api/ai/chat
   * Chat with HealthSync AI Assistant (Supports authenticated user or guest)
   */
  async chat(req, res, next) {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'A non-empty message string is required.'
        });
      }

      const user = req.user || null;

      const result = await aiService.processMessage({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        user
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/suggestions
   * Return initial prompts dynamically tailored to login state
   */
  async getSuggestions(req, res, next) {
    try {
      const user = req.user || null;
      const isLoggedIn = !!user;
      const suggestions = aiService.getSuggestedQuestions(isLoggedIn, user?.name);

      res.json({
        success: true,
        data: {
          isLoggedIn,
          userName: user?.name || null,
          suggestions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AiController();
