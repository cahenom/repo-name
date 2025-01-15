const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ status: false, message: 'Method not allowed' }),
        };
    }

    try {
        const { wb, kurir } = event.queryStringParameters;

        if (!wb || !kurir) {
            return {
                statusCode: 400,
                body: JSON.stringify({ status: false, message: 'Waybill dan Kurir harus diisi' }),
            };
        }

        const data = { wb, courier: kurir };
        const url = 'https://cek-ongkir.com/awb';

        const response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);

            // Informasi dasar
            const courierName = $('div.panel-heading').text().trim();
            const waybill = $('#summary tr:nth-child(2) td:last-child').text().trim();
            const serviceType = $('#summary tr:nth-child(3) td:last-child').text().trim();
            const weight = $('#summary tr:nth-child(4) td:last-child').text().trim();
            const shippingDate = $('#summary tr:nth-child(5) td:last-child').text().trim();
            const senderName = $('#summary tr:nth-child(6) td:last-child').text().trim();
            const receiverName = $('#summary tr:nth-child(7) td:last-child').text().trim();

            const senderLocation = $('tr:contains("Alamat Pengirim") td:last-child').text().trim();
            const receiverLocation = $('tr:contains("Alamat Penerima") td:last-child').text().trim();

            const historyTableRows = $('table.table.table-bordered tr:has(td)').not(':first-child');
            let shippingDetailData = [];

            historyTableRows.each((index, row) => {
                const shippingEvent = $(row).find('td').text().trim();
                if (shippingEvent) {
                    shippingDetailData.push({ shippingEvent });
                }
            });

            const latestShippingEvent = shippingDetailData.length > 0
                ? shippingDetailData[shippingDetailData.length - 1].shippingEvent
                : null;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: true,
                    info: {
                        senderName,
                        senderLocation,
                        receiverName,
                        receiverLocation,
                    },
                    Expedisi: {
                        nameExpedisi: courierName,
                        waybill: waybill,
                        layanan: serviceType,
                        weight: weight,
                        shippingDate: shippingDate,
                    },
                    detailPengiriman: shippingDetailData,
                    latestShippingEvent: latestShippingEvent,
                    shippingStatus: "ON PROCESS",
                }),
            };
        } else {
            return {
                statusCode: response.status,
                body: JSON.stringify({ status: false, message: `Error: ${response.status}` }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ status: false, message: error.response ? error.response.data : error.message }),
        };
    }
};
