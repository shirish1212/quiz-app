// Import necessary modules
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
var process = require('process');
var Validator = require('jsonschema').Validator;
var v = new Validator();
var quizDataRequestModel = require('./shared/requestModel/quizDataRequestModel');

// Import the responseFormatter module
const responseFormatter = require('./helper/responseFormatter');

// Load the configuration from config.json
const configPath = path.join(__dirname, 'config.json'); // Adjust the path to your config file
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create an Express application
const app = express();
const port = config.port;

const privateKey = fs.readFileSync('ssl/client.key', 'utf8');
const certificate = fs.readFileSync('ssl/client.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };


// Allow requests only from a specific domain
//app.use(cors({ origin: config.corsOriginFeURL }));
app.use(cors({ origin: "*"}));

// Load the SSL/TLS certificate and private key
const httpsServer = https.createServer(credentials, app);

// Parse JSON requests
app.use(express.json());

// Initialize responseFormatter
const formatter = new responseFormatter();

// Define Express routes and middleware
app.get('/', (req, res) => {
  res.send('Secure Hello, HTTPS!');
});

// Define a constant to store quizzes
const quizzes = [];

// POST API to create a quiz
app.post('/api/v1/quiz/create', (req, res) => {
  try {
    // Request Body Validation
    var resData = v.validate(req.body, quizDataRequestModel);
    if (!resData.valid) {
      // Use responseFormatter to format the error response
      const errorResponse = formatter.error('Invalid request parameters',resData);
      res.status(errorResponse.statusCode).json(errorResponse);
    }else{
        const { id,name, questions } = req.body;
        if (id && Array.isArray(questions) && questions.length > 0) {
          // Create a new quiz object
            const newQuiz = {
              id,
              name,
              questions,
            };

            // Store the quiz in the constant
            quizzes.push(newQuiz);

            // Use responseFormatter to format the success response
            const successResponse = formatter.success(newQuiz);
            res.status(successResponse.statusCode).json(successResponse.body);
        }else{
          const errorResponse = formatter.error('Invalid request parameters: id and questions are required.');
          return res.status(errorResponse.statusCode).json(errorResponse.body);
        }
    }
  } catch (error) {
    // Handle the error and log it to the file
    const errorResponse = formatter.error(error);
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

// GET API to retrieve a quiz by ID
app.get('/api/v1/quiz/:id', (req, res) => {
  try {
    const quizId = req.params.id;

    // Find the quiz by ID
    const quiz = quizzes.find(q => q.id === quizId);

    if (!quiz) {
      // Log and return an error response if the quiz is not found
      const errorResponse = formatter.error('Quiz not found.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Create a new object without the answer in questions
    const quizWithoutAnswers = {
      id: quiz.id,
      name: quiz.name,
      questions: quiz.questions.map(({ correct_option, ...rest }) => rest) // Exclude the answer field
    };
    // Use responseFormatter to format the success response
    const successResponse = formatter.success(quizWithoutAnswers);
    res.status(successResponse.statusCode).json(successResponse.body);
  } catch (error) {
    // Handle the error and log it to the file
    const errorResponse = formatter.error(error);
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

// Define a constant to store user answers (modified to store by user_id)
const userAnswers = [];

// POST API to submit an answer to a quiz question (updated to store user-specific answers)
app.post('/api/v1/quiz/:id/submit', (req, res) => {
  try {
    const quizId = req.params.id;
    const { user_id, que_id, answer } = req.body;

    // Validate the request body
    if (!user_id || !que_id || answer === undefined) {
      const errorResponse = formatter.error('Invalid request parameters: user_id, que_id, and answer are required.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Find the quiz by ID
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) {
      const errorResponse = formatter.error('Quiz not found.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Find the question by que_id
    const question = quiz.questions.find(q => q.que_id === que_id);
    if (!question) {
      const errorResponse = formatter.error('Question not found.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Check if the submitted answer is correct
    const isCorrect = answer === question.correct_option;

    // Store the user's answer, including user_id
    userAnswers.push({
      user_id,
      quizId,
      que_id,
      userAnswer: answer,
      correctAnswer: question.correct_option,
      isCorrect
    });

    // Prepare the response
    const response = {
      que_id,
      isCorrect,
      correctAnswer: question.correct_option
    };

    // Use responseFormatter to format the success response
    const successResponse = formatter.success(response);
    res.status(successResponse.statusCode).json(successResponse.body);
    
  } catch (error) {
    // Handle the error and log it to the file
    const errorResponse = formatter.error(error);
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

// GET API to retrieve user results for a specific quiz (filtered by user_id)
app.get('/api/v1/quiz/:id/results', (req, res) => {
  try {
    const quizId = req.params.id;
    const { user_id } = req.query; // Expecting user_id as a query parameter

    // Validate the user_id query parameter
    if (!user_id) {
      const errorResponse = formatter.error('User ID is required to retrieve results.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Filter user answers for the specific quiz and user_id
    const results = userAnswers.filter(answer => answer.quizId === quizId && answer.user_id === user_id);

    if (results.length === 0) {
      const errorResponse = formatter.error('No results found for this quiz and user.');
      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    // Calculate the score
    const score = results.filter(answer => answer.isCorrect).length;
    const totalQuestions = results.length;

    // Prepare the summary
    const summary = results.map(answer => ({
      que_id: answer.que_id,
      userAnswer: answer.userAnswer,
      correctAnswer: answer.correctAnswer,
      isCorrect: answer.isCorrect
    }));

    // Prepare the response
    const response = {
      score,
      totalQuestions,
      summary
    };

    // Use responseFormatter to format the success response
    const successResponse = formatter.success(response);
    res.status(successResponse.statusCode).json(successResponse.body);
    
  } catch (error) {
    // Handle the error and log it to the file
    const errorResponse = formatter.error(error);
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

// Start the HTTPS server
httpsServer.listen(port, () => {
  console.log(`HTTPS server is running on port ${port} - https://localhost:3000`);
  console.log("Process id-", process.pid);
});

// Handle a shutdown signal (e.g., Ctrl+C) to gracefully close the server
process.on('SIGINT', () => {
  console.log("Received SIGINT signal. Closing the server...");
  // Close the server and listen for the 'close' event
  httpsServer.close(() => {
    console.log("HTTPS server has been stopped.");
    process.exit(0); // Exit the process
  });
});