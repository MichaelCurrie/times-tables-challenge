## My 30-minute fun activity: [Times Tables Heatmap](https://times-tables.me)!

I wanted to create a heatmap for the multiplication tables; for example, I have noticed that 9x9 is easier for me to recall than 6x8.

<img src="https://github.com/user-attachments/assets/f63fec89-f52b-4e67-aebb-233b3013a98b" alt="Description" width="300">

So I asked ChatGPT o3-mini-high to do this:

> Write me a standalone website that will ask people to do multiplications up to 20x20 and time how long they took and whether it is correct.  so at the cetner of the screen it should ask them to do the times tables many many times and give the answer.  then at the end it should plot the results as a heatmap and also of all previous users

After testing it, I refined the code with this additional prompt:

> Please modify so you only ask 5 questions not 20 and in the end show the answers as a single heatmap and also count a wrong answer as what?  how to handle wrong answers vs answers which are timed ?  how to depict this?  anyway we should store each answer, what the answer was, by the way.  Store all of this data in a sqlite database stored server-side.  and serve the site using flask

Then I did this:

1. Log in to the AWS console

2. Buy domain [times-tables.me](https://times-tables.me) from AWS Route53

3. Launch AWS EC2 nano ubuntu instance; supply a public key for SSH access

4. Allocate an AWS Elastic IP and associate it with this instance

5. Add an A-record for the Route53 Hosted Zone `times-tables.me`

6. Add a security group allowing inbound on ports 80 (for certbot) and 443 (for HTTPS)

7. Use Putty to connect using the key pair used to make the EC2 instance and run:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx gunicorn python3-flask nginx
sudo certbot --nginx -d times-tables.me -d slicetomeetyou.com
echo "alias python=python3" >> ~/.bashrc && source ~/.bashrc
sudo tee /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name times-tables.me www.times-tables.me slicetomeetyou.com www.slicetomeetyou.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

git clone https://github.com/MichaelCurrie/times-tables-challenge.git

sudo tee /etc/systemd/system/gunicorn.service <<'EOF'
[Unit]
Description=Gunicorn instance serving Flask app for times tables
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/times-tables-challenge
ExecStart=/usr/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 app:app

[Install]
WantedBy=multi-user.target
EOF
```

8. Then I set up both the nginx and gunicorn processes to start on each server boot:

```bash
sudo systemctl daemon-reload

# Enable the nginx site configuration
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# Ensure the services are enabled
sudo systemctl enable gunicorn
sudo systemctl enable nginx

sudo systemctl start gunicorn
sudo systemctl start nginx

sudo systemctl reload nginx
```

Then a reboot to check that all is good:

```bash
sudo reboot
```

9. Then I removed the port 80 security group rule that has an inbound security risk, keeping only port 443 (HTTPS) open.

10. Now anyone in the world can use it!  Enjoy!

### How it works

We use a reverse proxy with **nginx** which will listen on port 80 and redirect to 5000, which is where **gunicorn** is running our **Flask** application (it knows to call `app.py`).

This Flask application is serving two routes:

* `@app.route("/")` serves our static HTML/CSS/JS code when the user first arrives at the homepage, and
* `@app.route("/submit", methods=["POST"])` serves the statistics for the heatmap

### Making changes

To debug something that's gone wrong, check the flask logs at:

```bash
sudo systemctl status gunicorn
sudo systemctl status nginx

journalctl -u gunicorn -f
journalctl -u nginx -f
```

If you make changes to the code, commit them, and then run:

```bash
git -C ~/times-tables-challenge/ pull
sudo systemctl stop gunicorn
sudo systemctl start gunicorn
```
