function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

function encryptFile() {
  var fileInput = document.getElementById('fileInput');
  var file = fileInput.files[0];
  var secretKeyInput = document.getElementById('secret');
  var aesKey = CryptoJS.lib.WordArray.random(32);
  var iv = CryptoJS.lib.WordArray.random(16);

  secretKeyInput.value = aesKey.toString(CryptoJS.enc.Hex);

  if (!file) {
      alert("ファイルを選択してください。");
      return;
  }

  showSpinner();

  var reader = new FileReader();

  reader.onload = function(e) {
      var wordArray = arrayBufferToWordArray(e.target.result);

      var encrypted = CryptoJS.AES.encrypt(wordArray, aesKey, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
      });

      var encryptedData = iv.concat(encrypted.ciphertext);
      var encryptedArrayBuffer = wordArrayToArrayBuffer(encryptedData);

      var blob = new Blob([encryptedArrayBuffer], { type: 'application/octet-stream' });
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = file.name + ".enc";
      link.click();

      hideSpinner();
  };

  reader.onerror = function() {
      alert("ファイルの読み込み中にエラーが発生しました。");
      hideSpinner();
  };

  reader.readAsArrayBuffer(file);
}

function decryptFile() {
  var fileInput = document.getElementById('fileInputDecrypt');
  var file = fileInput.files[0];
  var aesKeyHex = document.getElementById('recoveredSecret').value;
  var aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);

  if (!file || !aesKeyHex) {
      alert("ファイルとキーを選択してください。");
      return;
  }

  showSpinner();

  var reader = new FileReader();

  reader.onload = function(e) {
      var encryptedArrayBuffer = e.target.result;
      var encryptedWordArray = arrayBufferToWordArray(encryptedArrayBuffer);

      var iv = CryptoJS.lib.WordArray.create(encryptedWordArray.words.slice(0, 4));
      var ciphertext = CryptoJS.lib.WordArray.create(encryptedWordArray.words.slice(4), encryptedWordArray.sigBytes - 16);

      var decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, aesKey, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
      });

      var arrayBuffer = wordArrayToArrayBuffer(decrypted);
      var finalBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(finalBlob);
      link.download = file.name.replace(".enc", "");
      link.click();

      hideSpinner();
  };

  reader.onerror = function() {
      alert("ファイルの読み込み中にエラーが発生しました。");
      hideSpinner();
  };

  reader.readAsArrayBuffer(file);
}

function arrayBufferToWordArray(buffer) {
  var bytes = new Uint8Array(buffer);
  var words = [];
  var i;
  for (i = 0; i < bytes.length - 3; i += 4) {
      words.push(
          (bytes[i] << 24) |
          (bytes[i + 1] << 16) |
          (bytes[i + 2] << 8) |
          (bytes[i + 3])
      );
  }

  var remainingBytes = bytes.length % 4;
  if (remainingBytes > 0) {
      var lastWord = 0;
      for (var j = 0; j < remainingBytes; j++) {
          lastWord |= bytes[i + j] << (24 - j * 8);
      }
      words.push(lastWord);
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToArrayBuffer(wordArray) {
  var len = wordArray.sigBytes;
  var words = wordArray.words;
  var u8Array = new Uint8Array(len);

  var i = 0, j = 0;
  while (i < len) {
      var word = words[j++];
      if (word === undefined) {
          break;
      }
      u8Array[i++] = (word >> 24) & 0xFF;
      if (i === len) break;
      u8Array[i++] = (word >> 16) & 0xFF;
      if (i === len) break;
      u8Array[i++] = (word >> 8) & 0xFF;
      if (i === len) break;
      u8Array[i++] = word & 0xFF;
  }

  return u8Array.buffer;
}

function splitSecret() {
  var secret = document.getElementById('secret').value;
  var numShares = parseInt(document.getElementById('numShares').value);
  var threshold = parseInt(document.getElementById('threshold').value);

  if (numShares < threshold) {
      alert('分割数は閾値以上である必要があります。');
      return;
  }

  var secretHex = secrets.str2hex(secret);
  var shares = secrets.share(secretHex, numShares, threshold);
  document.getElementById('shares').value = shares.join(',');
}

function recoverSecret() {
  var sharesText = document.getElementById('shares').value;
  var shares = sharesText.split(',').map(function(share) {
      return share.trim();
  }).filter(function(share) {
      return share.length > 0;
  });

  var threshold = parseInt(document.getElementById('threshold').value);

  if (shares.length < threshold) {
      alert('少なくとも閾値数の分割した文字列が必要です。');
      return;
  }

  var secretHex = secrets.combine(shares);
  var secret = secrets.hex2str(secretHex);
  document.getElementById('recoveredSecret').value = secret;
}