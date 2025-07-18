#!/usr/bin/env node

const axios = require('axios');
const iconv = require('iconv-lite');
const { table } = require('table');
const fs = require('fs');
const { program } = require('commander');

const columns = ['名字', '代码', '当前股价(成本价)', '累计盈亏(%)', '今日盈亏(%)'];

const config = {
  showHead: true,
}

program
  .version('1.0.2', '-v, --version')
  .option('-c, --config <path>', '设置配置文件')
  .option('-d', '隐藏表头')
  .option('-s, --stock <list>', '设置stock代码, 多个以逗号隔开', (val) => val.split(','))

program.parse();


const options = program.opts();
if (options.d) {
  config.showHead = false;
}

if (options.stock) {
  printStock(options.stock)
} else if (options.config) {
  const data = fs.readFileSync(options.config);
  const config = JSON.parse(data);
  printStock(config.stocks);
}
// 计算总盈亏
function calTotalProfit(currentPrice, buyPrice, quantity) {
  if (quantity === 0) {
    return {
      profit: 0,
      profitPercent: 0
    }
  }
  let profit = (currentPrice - buyPrice) * quantity;
  return {
    profit: profit.toFixed(2),
    profitPercent: ((profit / (buyPrice * quantity)) * 100).toFixed(2)
  };
}

function calTodayProfit(percent, buyPrice, quantity) {
  if (quantity === 0) {
    return 0;
  }
  return (percent * buyPrice * quantity / 100).toFixed(2);
}

function printStock(stocks) {
  const list = stocks.map(stock => stock.code);
  axios({
    method: 'get',
    url: `https://qt.gtimg.cn/q=${list.join(',')}`,
    responseType: "arraybuffer"
  }).then(function (response) {
    let data = iconv.decode(response.data, 'gbk');
    let arr = data.split('\n');
    let tableData = [];
    if (config.showHead) {
      tableData.push(columns);
    }
    let totalProfit = 0;
    let totalProfitPercent = 0;
    let amount = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      let item = arr[i];
      // console.log(item)
      let c = item.split('~');
      const stock = stocks[i]
      amount += stock.quantity * stock.buyPrice;
      const { profit, profitPercent } = calTotalProfit(c[3], stock.buyPrice, stock.quantity);
      const todayProfit = calTodayProfit(c[32], stock.buyPrice, stock.quantity);
      totalProfit += Number(profit);
      tableData.push([
        c[1],
        c[2],
        `${c[3]}(${stock.buyPrice})`,
        `${profit}(${profitPercent}%)`,
        `${todayProfit}(${c[32]}%)`,
      ]);
    }
    totalProfitPercent = (totalProfit / amount * 100).toFixed(2);
    tableData.push([
      '总计',
      '',
      '',
      '',
      `${totalProfit.toFixed(2)}(${totalProfitPercent}%)`,
    ])
    console.log(table(tableData));
  }).catch(function (error) {
    throw error;
  });
}