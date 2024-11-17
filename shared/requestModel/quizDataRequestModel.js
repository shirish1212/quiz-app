var quizDataRequestModel = {
    "id": "/quizDataRequestModel",
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "name": {"type": "string"},
      "questions": {
        "type": "array",
        "items": {
          "type": "object",
          "que_id":{"type": "string"},
          "question": {"type": "string"},
          "options": {
              "type": "array",
              "items": {
                "type": "string",
              },
          },
          "correct_option": {"type": "string"},
          "required": ["que_id","question", "options","correct_option"]
        }
      }
    },
    "required": ["id","name","questions"]
  }
  
  module.exports = quizDataRequestModel;