barcode-agent
=============

Barcode Agent mobile app

Developer Setup
---------------

You need at least [Android SDK][android] and [Apache Cordova][cordova] 3.0.10 installed. Note that Cordova is very sensitive to exact version number and may cause trouble if any other version is used.

[android]: http://developer.android.com/sdk/index.html
[cordova]: http://cordova.apache.org/

1. Update the Android platform to match your local Android SDK setup:
```android update project -p ./platforms/android```.
2. Compile the project and run it in connected phone: ```cordova run android```

