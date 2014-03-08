barcode-agent
=============

Barcode Agent mobile app

Developer Setup
---------------

### Tools

You need at least [Android SDK][android] and [Apache Cordova][cordova] 3.0.10 installed. Note that Cordova is very sensitive to exact version number and may cause trouble if any other version is used. Also note that Cordova uses somewhat confusing system of version numbering. 3.0.10 is the version number of Cordova
CLI tool, while API version it uses is apparently called 3.0.0. The npm command
to install the right tool is:

```sh
$ sudo npm install -g cordova@3.0.10
```

[android]: http://developer.android.com/sdk/index.html
[cordova]: http://cordova.apache.org/

### Project setup

1. Update the Android platform to match your local Android SDK setup:
```android update project -p ./platforms/android```.
2. Compile the project and run it in connected phone: ```cordova run android```

