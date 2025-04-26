from dotenv import load_dotenv
load_dotenv()
import os
from flask import Flask, request, jsonify
from textblob import TextBlob
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
frontend_url = os.environ.get('FRONTEND_URL')
if frontend_url:
    CORS(app, origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"])
else:
    CORS(app)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
if not app.config['SECRET_KEY']:
    raise RuntimeError('SECRET_KEY environment variable must be set for production.')

# MongoDB setup
client = MongoClient(os.environ.get('MONGODB_URI', 'mongodb+srv://kurtkotiharsha:mongodb1104@cluster0.k4lwr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'))
db = client['sentiment_analysis']
users_collection = db['users']
chats_collection = db['chats']

# --- ADMIN DECORATOR ---


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user = users_collection.find_one({'email': data['email']})
            if not user or not user.get('is_admin', False):
                return jsonify({'error': 'Admin access required!'}), 403
            request.user = user
        except Exception:
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated


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
    # Optional: allow admin registration with a secret code
    is_admin = False
    admin_code = data.get('admin_code')
    if admin_code and admin_code == os.environ.get('ADMIN_CODE', 'letmeinadmin'):
        is_admin = True
    if not name or not email or not password:
        return jsonify({'error': 'Missing fields'}), 400
    if users_collection.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 400
    hashed_pw = generate_password_hash(password)
    users_collection.insert_one({'name': name, 'email': email, 'password': hashed_pw, 'is_admin': is_admin})
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
        'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'name': user['name'], 'email': user['email'], 'is_admin': user.get('is_admin', False)})


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
    chat_title = data.get('title')
    # Prevent duplicate Welcome Chat for this user
    if chat_title == 'Welcome Chat':
        existing = chats_collection.find_one({'user_email': user_email, 'title': 'Welcome Chat'})
        if existing and str(existing.get('id')) != str(chat_id):
            return jsonify({'message': 'Welcome Chat already exists'}), 200
    chat_doc = {
        'id': chat_id,
        'user_email': user_email,
        'title': chat_title,
        'created': data.get('created'),
        'messages': data.get('messages', [])
    }
    chats_collection.replace_one({'id': chat_id, 'user_email': user_email}, chat_doc, upsert=True)
    return jsonify({'message': 'Chat saved'})


@app.route('/chats/<chat_id>', methods=['DELETE'])
@token_required
def delete_chat(chat_id):
    user_email = request.user['email']
    # Match id as string or int for robustness
    result = chats_collection.delete_one({'id': {'$in': [chat_id, int(chat_id)]}, 'user_email': user_email})
    if result.deleted_count == 1:
        return jsonify({'message': 'Chat deleted'})
    else:
        return jsonify({'error': 'Chat not found'}), 404


@app.route('/chats', methods=['DELETE'])
@token_required
def delete_all_chats():
    user_email = request.user['email']
    result = chats_collection.delete_many({'user_email': user_email})
    return jsonify({'message': f'{result.deleted_count} chats deleted'})

# --- ADMIN ENDPOINTS ---


@app.route('/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    users = list(users_collection.find({}, {'_id': 0, 'password': 0}))
    return jsonify({'users': users})


@app.route('/admin/users/<email>', methods=['DELETE'])
@admin_required
def admin_delete_user(email):
    result = users_collection.delete_one({'email': email})
    chats_collection.delete_many({'user_email': email})
    if result.deleted_count == 1:
        return jsonify({'message': 'User deleted'})
    else:
        return jsonify({'error': 'User not found'}), 404


@app.route('/admin/users/<email>', methods=['PATCH'])
@admin_required
def admin_update_user(email):
    data = request.get_json()
    update = {}
    if 'is_admin' in data:
        update['is_admin'] = bool(data['is_admin'])
    if not update:
        return jsonify({'error': 'No valid fields to update'}), 400
    result = users_collection.update_one({'email': email}, {'$set': update})
    if result.matched_count == 1:
        return jsonify({'message': 'User updated'})
    else:
        return jsonify({'error': 'User not found'}), 404


@app.route('/admin/chats', methods=['GET'])
@admin_required
def admin_get_chats():
    chats = list(chats_collection.find({}, {'_id': 0}))
    return jsonify({'chats': chats})


@app.route('/admin/chats/<chat_id>', methods=['DELETE'])
@admin_required
def admin_delete_chat(chat_id):
    # Try to delete by id as string or int, for robustness
    result = chats_collection.delete_one({'id': {'$in': [chat_id, int(chat_id)]}})
    if result.deleted_count == 1:
        return jsonify({'message': 'Chat deleted'})
    else:
        # Fallback: try to delete by title if it's a Welcome Chat
        result2 = chats_collection.delete_one({'title': 'Welcome Chat', 'id': chat_id})
        if result2.deleted_count == 1:
            return jsonify({'message': 'Chat deleted by title'})
        return jsonify({'error': 'Chat not found'}), 404


@app.route('/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    user_count = users_collection.count_documents({})
    chat_count = chats_collection.count_documents({})
    admin_count = users_collection.count_documents({'is_admin': True})
    return jsonify({'users': user_count, 'chats': chat_count, 'admins': admin_count})


if __name__ == '__main__':
    # Use eventlet with Gunicorn in production, fallback to Flask dev server for local testing
    import os
    if os.environ.get('FLASK_ENV') == 'production':
        # In production, this block is not used; Gunicorn will launch the app
        pass
    else:
        app.run(host='0.0.0.0', port=5000)