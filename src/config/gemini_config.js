const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODELS = [
    process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-3.6-flash'
];

module.exports = {
    GEMINI_API_KEY,
    GEMINI_MODELS
};
