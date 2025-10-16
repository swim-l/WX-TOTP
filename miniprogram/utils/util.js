let TOTP = require('totp')

// 获取当前时间秒
function getSeconds() {
  let now = new Date()
  return now.getSeconds()
}

/**
 * 解析totp地址
 * @param {string} uri 
 */
function parseTotpURL(uri) {
  if (!uri || !uri.startsWith('otpauth://totp/')) {
    return null;
  }
  uri = uri.substring(15);
  let index = uri.indexOf('?');
  let label, secret, issuer;
  if (index >= 0) {
    label = decodeURIComponent(uri.substring(0, index));
    uri = uri.substring(index + 1);
  }
  const params = uri.split('&');
  for (const param of params) {
    index = param.indexOf('=');
    if (index <= 0) {
      continue;
    }
    const key = param.substring(0, index);
    const value = decodeURIComponent(param.substring(index + 1));
    if (key == 'secret') secret = value;
    else if (key == 'issuer') issuer = value;
  }
  return { label, issuer, secret };
}

/**
 * 时间格式化
 * @param {number} date 
 */
const dateToString = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return date.getFullYear()
    + '-' + String(date.getMonth() + 1).padStart(2, '0')
    + '-' + String(date.getDate()).padStart(2, '0')
    + ' ' + String(date.getHours()).padStart(2, '0')
    + ':' + String(date.getMinutes()).padStart(2, '0')
    + ':' + String(date.getSeconds()).padStart(2, '0');
}

// 解析小程序码scent
const bindIndexScene = (scene) => {
  if (!scene) {
    return false;
  }
  // 小程序码仅10分钟内有效
  const effectTime = Date.now() - (10 * 60 + 3) * 1000;
  const db = wx.cloud.database();
  db.collection('qr_scene').doc(scene).get({
    success: function (res) {
      if (res.data && res.data.createTime >= effectTime) {
        addToken(res.data, 'scan');
      } else {
        wx.showToast({ title: '小程序码已失效', icon: 'error' });
      }
    },
    fail: function (res) {
      wx.showToast({ title: '小程序码已失效', icon: 'error' });
    }
  });
}

/**
 * 更新token的本地缓存
 * @param {Array.<Object>} tokens 
 * @param {object} addItem 
 */
const addTokenStorage = (tokens, addItem) => {
  tokens.push(addItem);
  // 更新缓存
  wx.setStorage({
    key: 'token',
    data: tokens,
    success: function (res) {
      wx.showToast({
        title: "添加成功",
        icon: "success"
      })
    },
    fail: function (res) {
      wx.showToast({
        title: "添加失败",
        icon: "error"
      })
    },
    complete: function () {
      wx.reLaunch({
        url: '/pages/index/index?refresh',
      })
    }
  })
  uploadToken(tokens);
}

// 添加token
function addToken(totpInfo, path) {
  if (!totpInfo || !totpInfo.secret) {
    return;
  }
  if (!TOTP.now(totpInfo.secret)) {
    wx.showModal({
      content: 'KEY不合法',
      showCancel: false,
      confirmText: '返回',
      confirmColor: '#ff9c10',
    });
    return;
  }
  totpInfo.createTime = Date.now();
  // 获取缓存的token数组
  wx.getStorage({
    key: 'token',
    success: function (res) {
      addTokenStorage(res.data || [], totpInfo);
    },
    fail: function (res) {
      addTokenStorage([], totpInfo);
    },
    complete: function () {
      if ("man" == path) {
        wx.reLaunch({
          url: '/pages/index/index?refresh',
        })
        wx.showToast({
          title: "添加成功",
          icon: "success"
        })
      } else if ("scan" == path) {
        wx.reLaunch({
          url: 'index?refresh=true',
        })
      }
    }
  })
}

// 删除token
function removeToken(token_id) {
  let token = []
  wx.showModal({
    content: '云端该记录也将同步删除，确定删除吗?',
    showCancel: true,
    cancelText: '取消',
    cancelColor: '#929292',
    confirmText: '确定',
    confirmColor: '#ff9c10',
    success: function (res) {
      if (res.confirm) {
        // 确定删除
        wx.getStorage({
          key: 'token',
          success: function (res) {
            token = res.data
            // 删除指定一位
            token.splice(token_id, 1)
            // 重新存储
            wx.setStorage({
              key: 'token',
              data: token,
              success: function (res) {
                console.log(res)
              },
              fail: function (res) {
                console.log(res)
              }
            })
            uploadToken(token);
          },
          complete: function (res) {
            wx.reLaunch({
              url: 'index',
            })
          }
        })
      } else if (res.cancel) {
        console.log("cancelled")
      }
    }
  })
}

function uploadToken(token) {
  const db = wx.cloud.database();
  const _ = db.command;
  const currentTime = new Date();
  db.collection('otp').add({
    data: {
      token,
      type: 'auto',
      num: token.length,
      createTime: currentTime.getTime()
    }
  }).then(res => {
    if (res && res._id) {
      // 备份成功，删除旧数据
      db.collection('otp').where({ _id: _.neq(res._id) }).remove();
    }
  }).catch(_err => {
    wx.showToast({
      title: '同步云端失败，请手动备份',
      icon: 'none',
      duration: 2000
    })
    console.log("_err", _err)
  })
}

/**
  获取云数据库的动态口令
**/
function getDbData() {
  const db = wx.cloud.database();
  var dbData = []
  db.collection('otp').orderBy('createTime', 'desc').limit(1).get({
    success: function (res) {
      if (res && res.data && res.data[0]) {
        const data = res.data[0];
        const token = data.token;
        if (data.num > 0) {
          const text = `发现${data.num}条数据，确定使用云端数据覆盖本地记录？`
          wx.showModal({
            title: '云端数据恢复',
            content: text,
            confirmColor: '#ff9c10',
            success(res) {
              if (res.confirm) {
                wx.setStorage({
                  key: 'token',
                  data: token,
                  success: function (res) {
                    wx.showToast({
                      title: '数据恢复成功',
                      icon: 'success',
                      duration: 2000
                    })
                    dbData = token
                  },
                  fail: function (res) {
                    console.log(res)
                  },
                })

              } else if (res.cancel) {
                console.log('用户点击取消')
              }
            }
          })
        } else {
          wx.showToast({
            title: '未发现备份数据',
            icon: 'none',
            duration: 2000
          })
        }
      } else {
        wx.showToast({
          title: '未发现备份数据',
          icon: 'none',
          duration: 2000
        })
      }

    }
  })
}

/**
 转换secret的值
**/
function convertSec(list) {

  var res = list.map(item => ({
    ...item,
    secret: TOTP.now(item.secret)
  }))
  return res
}

module.exports = {
  getSeconds: getSeconds,
  addToken: addToken,
  removeToken: removeToken,
  parseTotpURL: parseTotpURL,
  uploadToken: uploadToken,
  bindIndexScene: bindIndexScene,
  dateToString: dateToString,
  getDbData: getDbData,
  convertSec: convertSec
}
