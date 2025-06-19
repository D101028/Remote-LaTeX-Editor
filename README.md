# Remote-LaTeX-Editor
A simple remote latex online editor.

## Getting Started

1. Build the Python environment.

2. Create the virtual environment.
```shell
$ python3 -m venv .venv
```

3. Activate the virtual environment.
```shell
# Windows
$ .venv/Scripts/activate

# Unix / MacOS
$ source .venv/bin/activate
```

4. Create the config file. 

You may edit and use the template config file `./config.conf`, 
or just use your own config file. 

5. Start the app.
```shell
$ python3 main.py                       # Use the default config file `./config.conf` 
$ python3 main.py -c your_config.conf   # Use your own config file
```

## Third-Party Libraries Notice

This project uses [PDF.js](https://github.com/mozilla/pdf.js). Its source code and viewer interface are licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). The original license file can be found at `app/static/pdfjs/LICENSE`.
