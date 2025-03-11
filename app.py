from flask import Flask, render_template, request, jsonify
import requests
import json
import re
import platform
import psutil
import datetime
from bs4 import BeautifulSoup

app = Flask(__name__)

def get_system_info():
    """Get system information for server status display"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        uptime = datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time())
        uptime_str = str(uptime).split('.')[0]  # Remove microseconds
        system = platform.system()
        python_version = platform.python_version()
        
        return {
            "status": "Running",
            "system": system,
            "python_version": python_version,
            "cpu_usage": f"{cpu_percent}%",
            "memory_usage": f"{memory_percent}%",
            "uptime": uptime_str
        }
    except Exception as e:
        return {"status": "Degraded", "error": str(e)}

def extract_quiz_content(quiz_url):
    """Extract questions and options from a Google Form quiz"""
    try:
        response = requests.get(quiz_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        questions_data = []
        
        # Find all question containers
        question_containers = soup.find_all('div', role='listitem')
        
        for container in question_containers:
            # Find the question text
            question_element = container.find('div', attrs={'role': 'heading'})
            if not question_element:
                continue
                
            question_text = question_element.text.strip()
            
            # Skip if not a question
            if not question_text or "Required" in question_text:
                continue
                
            # Find options for multiple choice questions
            options = []
            option_elements = container.find_all('div', attrs={'role': 'radio'})
            if not option_elements:
                option_elements = container.find_all('div', attrs={'role': 'checkbox'})
                
            for option_element in option_elements:
                option_label = option_element.find('div', attrs={'class': 'docssharedWizToggleLabeledContent'})
                if option_label:
                    option_text = option_label.text.strip()
                    options.append(option_text)
                    
            # Add to our list
            questions_data.append({
                'question': question_text,
                'options': options
            })
        
        return {"success": True, "data": questions_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_chatgpt_answers(questions_data, api_url):
    """Get answers for the questions using the ChatGPT API"""
    try:
        # Prepare the quiz content for the API
        prompt = "Please answer the following quiz questions with the correct option letter:\n\n"
        
        for i, q in enumerate(questions_data, 1):
            prompt += f"Question {i}: {q['question']}\n"
            for j, option in enumerate(q['options']):
                option_letter = chr(65 + j)  # Convert to A, B, C, etc.
                prompt += f"{option_letter}. {option}\n"
            prompt += "\n"
        
        # Call the API
        response = requests.get(f"{api_url}?text={prompt}")
        
        return {"success": True, "data": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route('/')
def index():
    return render_template('index.html', server_status=get_system_info())

@app.route('/extract', methods=['POST'])
def extract():
    data = request.get_json()
    quiz_url = data.get('quiz_url')
    
    if not quiz_url:
        return jsonify({"success": False, "error": "No URL provided"})
    
    result = extract_quiz_content(quiz_url)
    return jsonify(result)

@app.route('/get_answers', methods=['POST'])
def get_answers():
    data = request.get_json()
    questions_data = data.get('questions_data')
    
    if not questions_data:
        return jsonify({"success": False, "error": "No questions data provided"})
    
    api_url = "https://api.freegpt4.ddns.net"
    result = get_chatgpt_answers(questions_data, api_url)
    return jsonify(result)

@app.route('/server_status')
def server_status():
    return jsonify(get_system_info())

if __name__ == '__main__':
    app.run(debug=True)