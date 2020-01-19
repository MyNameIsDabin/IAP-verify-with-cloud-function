const functions = require('firebase-functions');
const admin = require('firebase-admin');
const key = require('./service-account-key.json'); // Your JWT Json file.
const { google } = require('googleapis');

admin.initializeApp();

const authClient = new google.auth.JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ["https://www.googleapis.com/auth/androidpublisher"]
});

const playDeveloperApiClient = google.androidpublisher({
  version: 'v3',
  auth: authClient
});

exports.validatePurchase = functions.https.onRequest(async (req, res) => {
  const {packageName, productId, purchaseToken} = req.body;

  try {
      await authClient.authorize();

      // 소모 상품만 이 코드를 사용. 구독형은 purchases.subscriptions 함수 참고
      const product = await playDeveloperApiClient.purchases.products.get({
        packageName: packageName,
        productId: productId,
        token: purchaseToken
      });

      // 파이어 베이스 DB 를 사용한다면 기록한다.
      await admin.database().ref('/receipt').push(req.body);

      if (product.status === 200) {
        res.json({
          is_success: true,
          status: 200,
          message: "Subscription verification successfuly!",
          sku: productId
        });
        return;
      }
  } catch (error) {
    // Logging error for debugging
    console.log(error);
  }
  
  // This message is returned when there is no successful response from the subscription/purchase get call
  res.json({
    is_success: false,
    status: 500,
    message: "Failed to verify subscription, Try again!",
    sku: ""
  });
  return;
});
