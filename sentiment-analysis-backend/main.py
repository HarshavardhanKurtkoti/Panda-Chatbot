from flask import Flask, request, jsonify
from textblob import TextBlob
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app, origins="*")
load_dotenv()
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key_here')  # Use env var or fallback

# MongoDB setup
client = MongoClient(os.environ.get('MONGODB_URI', 'mongodb+srv://kurtkotiharsha:mongodb1104@cluster0.k4lwr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'))
db = client['sentiment_analysis']
users_collection = db['users']
chats_collection = db['chats']

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user = users_collection.find_one({'email': data['email']})
            if not user:
                return jsonify({'error': 'User not found!'}), 401
            request.user = user
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def index():
    return '<h2>Panda Chatbot Backend is running!</h2>'

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not name or not email or not password:
        return jsonify({'error': 'Missing fields'}), 400
    if users_collection.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 400
    hashed_pw = generate_password_hash(password)
    users_collection.insert_one({'name': name, 'email': email, 'password': hashed_pw})
    return jsonify({'message': 'User registered successfully'})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Missing fields'}), 400
    user = users_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = jwt.encode({
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'name': user['name'], 'email': user['email']})

@app.route('/logout', methods=['POST'])
def logout():
    # For JWT, logout is handled client-side by deleting the token
    return jsonify({'message': 'Logged out'})

@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    data = request.get_json()
    message = data.get('message', '')
    blob = TextBlob(message)
    polarity = blob.sentiment.polarity
    if polarity > 0.1:
        sentiment = "positive"
    elif polarity < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    confidence = abs(polarity)
    return jsonify({'sentiment': sentiment, 'confidence': confidence})

@app.route('/chats', methods=['GET'])
@token_required
def get_chats():
    user_email = request.user['email']
    chats = list(chats_collection.find({'user_email': user_email}, {'_id': 0}))
    return jsonify({'chats': chats})

@app.route('/chats', methods=['POST'])
@token_required
def save_chat():
    user_email = request.user['email']
    data = request.get_json()
    chat_id = data.get('id')
    chat_doc = {
        'id': chat_id,
        'user_email': user_email,
        'title': data.get('title'),
        'created': data.get('created'),
        'messages': data.get('messages', [])
    }
    chats_collection.replace_one({'id': chat_id, 'user_email': user_email}, chat_doc, upsert=True)
    return jsonify({'message': 'Chat saved'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)