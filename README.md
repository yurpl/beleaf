# Site
Our site is hosted at: [beleaf.live](http://beleaf.live)
# Steps Run Demo Locally
## Docker
All Dockerfiles included and Docker compose script also included. To run on docker just run:
`docker compose up`
## Clone repo
`git clone https://github.com/yurpl/beleaf.git`

## Download Flan-T5 checkpoint
https://drive.google.com/drive/folders/1PwwxxfCw_UPcbsbFa3-QSyuzK0xSY5MF?usp=sharing
## Set PATH variable to model checkpoint in `api/inference.py`

## Install Dependencies
`sh start.sh`

## Set the `api_url`
#### In the directory `app/beleaf_frontend/src/` set the root_url inside `config.js`:

```
export const config = {
    api_url : "localhost",
    api_port: 5001, 
    api_endpoint : "inference"
}
```

NOTE: I used port 5001 for running locally on my Mac
