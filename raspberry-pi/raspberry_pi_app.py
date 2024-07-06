from flask import Flask, request
import RPi.GPIO as GPIO

app = Flask(__name__)

GPIO.setmode(GPIO.BCM)
pins = {}

@app.route('/control_gpio', methods=['POST'])
def control_gpio():
    data = request.json
    pin = data['pin']
    action = data['action']
    
    if pin not in pins:
        GPIO.setup(pin, GPIO.OUT)
        pins[pin] = GPIO.LOW
    
    if action == 'on':
        GPIO.output(pin, GPIO.HIGH)
        pins[pin] = GPIO.HIGH
    elif action == 'off':
        GPIO.output(pin, GPIO.LOW)
        pins[pin] = GPIO.LOW
    
    return {'status': 'success'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
