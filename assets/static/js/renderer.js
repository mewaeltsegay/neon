var path = require("path")
document.addEventListener('DOMContentLoaded', function() {
    $('#mainContent').load('views/chart.html')
    document.querySelector('#dash').addEventListener("click", (event) => {
        $('#mainContent').load(path.join(__dirname,'views/chart.html'))
        // createChart()
    })
    document.querySelector('#insert').addEventListener("click", (event) => {
        $('#mainContent').load('views/Insertform.html')
    })
    document.querySelector('#logs').addEventListener("click", (event) => {
        $('#mainContent').load('views/logs.html')
        // retrieveLogs()
    })
    document.querySelector('#power').addEventListener("click", (event) => {
        $('#mainContent').load('views/power_form.html')
        // retrieveLogs()
    })
    document.querySelector('#power_history').addEventListener("click", (event) => {
        $('#mainContent').load('views/power_history.html')
        // retrieveProductionHistory()
    })
    document.querySelector('#prod').addEventListener("click", (event) => {
        $('#mainContent').load('views/production_form.html')
        // retrieveLogs()
    })
    document.querySelector('#prod_history').addEventListener("click", (event) => {
        $('#mainContent').load('views/production_history.html')
        // retrieveProductionHistory()
    })
    document.querySelector('#report_prod').addEventListener("click",(event) =>{
        $('#mainContent').load('views/production_report.html')
    })
    document.querySelector('#report_finance').addEventListener("click",(event) =>{
        $('#mainContent').load('views/financial_report.html')
    })
    document.querySelector('#data').addEventListener("click",(event) =>{
        $('#mainContent').load('views/data.html')
    })
    document.querySelector('#expenses').addEventListener("click",(event) =>{
        $('#mainContent').load('views/expenses.html')
    })
    document.querySelector('#revenue').addEventListener("click",(event) =>{
        $('#mainContent').load('views/revenue.html')
    })
})

function exportData(){
    const {remote} = require('electron')
    const fs = require('fs')
    var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));
    var dialog = remote.dialog;

    var browserWindow = remote.getCurrentWindow();
    var options = {
        title: "Export",
        defaultPath : "Documents/exported_data",
        filters: [
            {name: 'Custom File Type', extensions: ['neon']}
        ]
    }

    let saveDialog = dialog.showSaveDialog(browserWindow, options);
    saveDialog.then(function(saveTo) {
        fs.writeFileSync(saveTo.filePath,filebuffer)
        $('#ok').attr("data-type", "success").attr("data-message", "Data has been exported.").attr("data-title", "Success! ").click()
    })
}

async function importData(event){
    const sqlite3 = require('sqlite3').verbose()
    const path2 = require('path')

    event.preventDefault()
    if(checkFormValidity2() === false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Select a .neon file first.").attr("data-title", "Error! ").click()
        return false
    }
    else{
        var input = document.querySelector("#data_location")
        var path = input.files[0].path
        var extention = path.substring(path.length - 4, path.length)

        if(extention !== "neon") {
            $('#ok').attr("data-type", "danger").attr("data-message", "Choose a .neon file.").attr("data-title", "Error! ").click()
            return false
        }
        else {
            let sqlite3 = require('sqlite3').verbose()
            let sourceDBPath = path.replaceAll('\\','/')
            let tables = ["power","production","logs","expenses"]
            let destDB = new sqlite3.Database(path2.join(__dirname,"py/neon.db"))

            destDB.serialize(function (){
                destDB.run(`ATTACH '${sourceDBPath}' AS sourceDB`)
                tables.map(table => {
                    destDB.run(`
                    INSERT INTO ${table} SELECT * FROM sourceDB.${table}
                    `)
                })
            })
            $('#ok').attr("data-type", "success").attr("data-message", "Import Complete.").attr("data-title", "Success! ").click()
            destDB.close()

        }

    }



        // reader.readAsDataURL(input.files[0]);
}

function generateProductionReport(event,month){
    const carbone = require("carbone")
    const moment = require("moment")
    const fs = require("fs")

    var month_number = moment(month).format("M")
    var year = moment(month).format("YYYY")

    event.preventDefault();
    const sqlite3 = require('sqlite3').verbose();
    // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

    var db = null
    var data = []

    db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
    db.all("with pow as (select power.month || '/' || power.date || '/' || power.year as date1, ifnull(round((power.kvarh - lag(power.kvarh,1) over (order by power.year,power.month,power.date)),1),0) as kvarh,power.kvarh as kvarh_reading, ifnull(round((power.kwh - lag(power.kwh,1) over (order by power.year,power.month,power.date)),1),0) as kwh, power.kwh as kwh_reading from power where power.month = ? and power.year = ? group by power.year,power.month,power.date order by power.year,power.month,power.date asc),prod as (select production.month || '/' || production.date || '/' || production.year as date2, production.production from production where production.month = ? and production.year = ? GROUP by production.year,production.month,production.date order by production.year,production.month,production.date asc) select date1,kvarh_reading,kvarh,kwh_reading,kwh,production from pow,prod where (date1 = date2)",[month_number,year,month_number,year],(error,rows) => {
        if(error)
            console.log(error.message)
        else{
            rows.forEach((row)=>{
                var r = {
                    date: row.date1,
                    kwh: row.kwh_reading,
                    kwh_diff: row.kwh,
                    kwh_price: Number(row.kwh*2.52*60).toFixed(2),
                    kvarh: row.kvarh_reading,
                    kvarh_diff: row.kvarh,
                    kvarh_price: Number(row.kvarh*3.3*60).toFixed(2),
                    prod: row.production,
                    prod_revenue: Number(row.production*1200).toFixed(2),
                    total_cost: Number((row.kwh*2.52*60) + (row.kvarh*3.3*60)).toFixed(2)
                }
                data.push(r)
            })
        }
    })
    db.close()

    if(checkFormValidity() == false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        const {remote} = require('electron');
        var dialog = remote.dialog;

        var browserWindow = remote.getCurrentWindow();
        var options = {
            title: "Save new file as...",
            defaultPath : "Documents/production_report",
            filters: [
                {name: 'Custom File Type', extensions: ['xlsx']}
            ]
        }

        let saveDialog = dialog.showSaveDialog(browserWindow, options);
        saveDialog.then(function(saveTo) {
            carbone.render(path.join(__dirname,"py/production_report.xlsx"), data, function(err, result){
                if (err) {
                    return console.log(err);
                }
                // write the result
                fs.writeFileSync(saveTo.filePath, result)
                $('#ok').attr("data-type", "success").attr("data-message", "Report has been saved.").attr("data-title", "Success! ").click()
                document.querySelector('#needs-validation').reset()
                $("#needs-validation").find('input,select').removeClass('is-valid is-invalid')
            })
            //>> /path/to/new_file.jsx
        })
    }
}
function generateFinancialReport(event,month){
    const carbone = require("carbone")
    const moment = require("moment")
    const ucwords = require("ucwords")
    const fs = require("fs")

    var month_number = moment(month).format("M")
    var month_name = moment(month).format("MMMM")
    var year = moment(month).format("YYYY")

    event.preventDefault();
    const sqlite3 = require('sqlite3').verbose();
    // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

    var db = null
    var expenses_total = []
    var expenses = []
    var revenues = []
    var revenue_total = []
    let production_total = []
    let total_income = []
    let net_income = []

    if(checkFormValidity2() == false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'NKF'

            // These options are needed to round to whole numbers if that's what you want.
            //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
            //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
        })
        db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
        db.all("select month,year,expense_name,expense_value from expenses where month = ? and year = ?",[month_number,year],(error,rows) => {
            if(error)
                console.log(error.message)
            else{
                rows.forEach((row)=>{
                    var r = {
                        expense_name: ucwords(row.expense_name),
                        expense_value: formatter.format(Number(row.expense_value).toFixed(2))
                    }
                    expenses.push(r)
                })
            }
        })
        db.all("select month,year,revenue_name,revenue_value from revenue where month = ? and year = ?",[month_number,year],(error,rows) => {
            if(error)
                console.log(error.message)
            else{
                rows.forEach((row)=>{
                    var r = {
                        revenue_name: ucwords(row.revenue_name),
                        revenue_value: formatter.format(Number(row.revenue_value).toFixed(2))
                    }
                    revenues.push(r)
                })
            }
        })
        db.all("with prod as (select sum(production)*1.2*1000 as total from production where month = ? and year = ?), rev as (select sum(revenue_value) as total from revenue where month = ? and year = ?), exp as (SELECT sum(expense_value) as total from expenses where month = ? and year = ?) select prod.total as production_total,rev.total as revenue_total, (prod.total + rev.total) as total_income,exp.total as expenses_total,(prod.total - exp.total) as net_income from prod,rev,exp",[month_number,year,month_number,year,month_number,year], (error,rows) => {
            if(error)
                console.log(error.message)
            else{
                rows.forEach((row)=> {
                    total_income.push(formatter.format(row.total_income))
                    production_total.push(formatter.format(row.production_total))
                    net_income.push(formatter.format(row.net_income))
                    expenses_total.push(formatter.format(row.expenses_total))
                })
            }
        })
        db.close()
        var temp = {
            month: month_name,
            year: year,
            total_expenses: expenses_total,
            expenses: expenses,
            revenues: revenues,
            production: production_total,
            total_income: total_income,
            net_income: net_income
        }

        const {remote} = require('electron');
        var dialog = remote.dialog;

        var browserWindow = remote.getCurrentWindow();
        var options = {
            title: "Save new file as...",
            defaultPath : "Documents/financial_report",
            filters: [
                {name: 'Custom File Type', extensions: ['docx']}
            ]
        }

        let saveDialog = dialog.showSaveDialog(browserWindow, options);
        saveDialog.then(function(saveTo) {
            carbone.render(path.join(__dirname,"py/financial_report.docx"), temp, function(err, result){
                if (err) {
                    return console.log(err);
                }
                // write the result
                fs.writeFileSync(saveTo.filePath, result)
                $('#ok').attr("data-type", "success").attr("data-message", "Report has been saved.").attr("data-title", "Success! ").click()
                document.querySelector('#needs-validation2').reset()
                $("#needs-validation2").find('input,select').removeClass('is-valid is-invalid')
            })
            //>> /path/to/new_file.jsx
        })

    }
}
function saveExpense(event) {
    let sqlite3 = require('sqlite3')
    let path = require('path')
    let moment = require('moment')
    let ucwords = require('ucwords')

    var table = $("#expenseDataTable").DataTable()

    event.preventDefault();
    if(checkFormValidity2() == false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',

            // These options are needed to round to whole numbers if that's what you want.
            //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
            //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
        })
        var data = []
        var row = []
        var date = moment(new Date(document.getElementById("expense_date").value))
        data.push(moment(date).format("M"))
        data.push(moment(date).format("YYYY"))
        data.push(document.querySelector("#expense_name").value)
        data.push(document.querySelector("#expense_value").value)
        data.push(document.querySelector("#expense_remark").value)

        row.push(moment(date).format("MM/YYYY"))
        row.push(ucwords(document.querySelector("#expense_name").value))
        row.push(formatter.format(document.querySelector("#expense_value").value) + " NKF")
        row.push(document.querySelector("#expense_remark").value)

        var db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
        db.run('insert into expenses(month,year,expense_name,expense_value,remark) values (?,?,?,?,?)',data,(error,results) => {
            if(error) {
                $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
                console.error(error)
            }
            else{
                $('#ok').attr("data-type", "success").attr("data-message", "Expense has been saved.").attr("data-title", "Success! ").click()
                document.querySelector('#needs-validation2').reset()
                $("#needs-validation2").find('input,select').removeClass('is-valid is-invalid')
                db.all('select max(id) as id from expenses',(err,results) => {
                    if(err)
                        console.log(err.message)
                    else {
                        row.push('<button type="button" class="btn cur-p bg-transparent border-0 delete" id="' + results[0].id + '"><i class="fas fa-trash text-danger"></i></button>')
                        table.row.add(row).draw()
                    }
                })
            }
        })

    }
}
function saveRevenue(event) {
    let sqlite3 = require('sqlite3')
    let path = require('path')
    let moment = require('moment')
    let ucwords = require('ucwords')

    var table = $("#revenueDataTable").DataTable()

    event.preventDefault();
    if(checkFormValidity2() == false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',

            // These options are needed to round to whole numbers if that's what you want.
            //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
            //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
        })
        var data = []
        var row = []
        var date = moment(new Date(document.getElementById("revenue_date").value))
        data.push(moment(date).format("M"))
        data.push(moment(date).format("YYYY"))
        data.push(document.querySelector("#revenue_name").value)
        data.push(document.querySelector("#revenue_value").value)
        data.push(document.querySelector("#revenue_remark").value)

        row.push(moment(date).format("MM/YYYY"))
        row.push(ucwords(document.querySelector("#revenue_name").value))
        row.push(formatter.format(document.querySelector("#revenue_value").value) + " NKF")
        row.push(document.querySelector("#revenue_remark").value)

        var db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))

        db.run('insert into revenue(month,year,revenue_name,revenue_value,remark) values (?,?,?,?,?)', data, (error, results) => {
            if (error) {
                $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
                console.error(error)
            } else {
                $('#ok').attr("data-type", "success").attr("data-message", "Expense has been saved.").attr("data-title", "Success! ").click()
                document.querySelector('#needs-validation2').reset()
                $("#needs-validation2").find('input,select').removeClass('is-valid is-invalid')
                // table.row.add(row).draw()
                db.all('select max(id) as id from revenue',(err,results) => {
                    if(err)
                        console.log(err.message)
                    else {
                        row.push('<button type="button" class="btn cur-p bg-transparent border-0 delete" id="' + results[0].id + '"><i class="fas fa-trash text-danger"></i></button>')
                        table.row.add(row).draw()
                    }
                })
            }
        })

    }
}
function sendForm(event){
    event.preventDefault();
    if(checkFormValidity() == false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var data = []
        var datestr = new Date(document.getElementById("date").value)
        data.push(datestr.getDate())
        data.push(datestr.getMonth() + 1)
        data.push(datestr.getFullYear())
        data.push(document.getElementById("time").value)
        data.push(document.getElementById("low_pressure").value)
        data.push(document.getElementById("temp1").value)
        data.push(document.getElementById("high_pressure").value)
        data.push(document.getElementById("temp2").value)
        data.push(document.getElementById("oil_pressure").value)
        data.push(document.getElementById("oil_level").value)
        data.push(document.getElementById("l1").value)
        data.push(document.getElementById("l2").value)
        data.push(document.getElementById("l3").value)
        data.push(document.getElementById("water_consumption").value)
        data.push(document.getElementById("valve_temp").value)
        data.push(document.getElementById("remark").value)
        data.push(document.getElementById("machine").value)

        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();
        // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

        var db = null
        var results = []


        db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
        db.run("INSERT INTO logs('date','month','year','time','low_pressure','temperature_low','high_pressure','temperature_high','oil_pressure','oil_level','current_l1','current_l2','current_l3','water_consumption','exp_value_temp','remark','machine') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",data,function(err){
            if(err){
                $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
                console.error(err.message)
            }
            $('#ok').attr("data-type", "success").attr("data-message", "Log has been saved.").attr("data-title", "Success! ").click()
            document.getElementById("date").value = ""
            document.getElementById("date").classList.remove("is-valid")
            document.getElementById("time").value = ""
            document.getElementById("time").classList.remove("is-valid")
            document.getElementById("low_pressure").value = ""
            document.getElementById("low_pressure").classList.remove("is-valid")
            document.getElementById("temp1").value = ""
            document.getElementById("temp1").classList.remove("is-valid")
            document.getElementById("high_pressure").value = ""
            document.getElementById("high_pressure").classList.remove("is-valid")
            document.getElementById("temp2").value = ""
            document.getElementById("temp2").classList.remove("is-valid")
            document.getElementById("oil_level").options[0].selected = true
            document.getElementById("oil_level").classList.remove("is-valid")
            document.getElementById("oil_pressure").value = ""
            document.getElementById("oil_pressure").classList.remove("is-valid")
            document.getElementById("l1").value = ""
            document.getElementById("l1").classList.remove("is-valid")
            document.getElementById("l2").value = ""
            document.getElementById("l2").classList.remove("is-valid")
            document.getElementById("l3").value = ""
            document.getElementById("l3").classList.remove("is-valid")
            document.getElementById("water_consumption").value = ""
            document.getElementById("water_consumption").classList.remove("is-valid")
            document.getElementById("valve_temp").value = ""
            document.getElementById("valve_temp").classList.remove("is-valid")
            document.getElementById("remark").value = ""
            document.getElementById("machine").options[0].selected = true
            document.getElementById("machine").classList.remove("is-valid")
        });
    }
}
function savePower(event){
    event.preventDefault();
    if(checkFormValidity2() === false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var data = []
        var datestr = new Date(document.querySelector("#power_date").value)
        data.push(datestr.getDate())
        data.push(datestr.getMonth() + 1)
        data.push(datestr.getFullYear())
        data.push(document.querySelector("#power_kwh").value)
        data.push(document.querySelector("#power_remark").value)
        data.push(document.querySelector("#power_kvarh").value)

        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();
        // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

        var db = null
        var results = []


        db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
        db.run("INSERT INTO power('date','month','year','kwh','remark','kvarh') VALUES (?,?,?,?,?,?)",data,function(err){
            if(err){
                $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
                console.error(err.message)
            }
            $('#ok').attr("data-type", "success").attr("data-message", "Log has been saved.").attr("data-title", "Success! ").click()
            document.querySelector("#power_date").value = ""
            document.querySelector("#power_date").classList.remove("is-valid")
            document.querySelector("#power_kwh").value = ""
            document.querySelector("#power_kwh").classList.remove("is-valid")
            document.querySelector("#power_remark").value = ""
            document.querySelector("#power_kvarh").value = ""
            document.querySelector("#power_kvarh").classList.remove("is-valid")
        });

        db.close()
    }
}
function saveProduction(event){
    event.preventDefault();
    if(checkFormValidity() === false){
        $('#ok').attr("data-type", "warning").attr("data-message", "Fill the form correctly and try again.").attr("data-title", "Error! ").click()
        return false
    }
    else {
        var data = []
        var datestr = new Date(document.querySelector("#prod_date").value)
        data.push(datestr.getDate())
        data.push(datestr.getMonth() + 1)
        data.push(datestr.getFullYear())
        data.push(document.querySelector("#production").value)
        data.push(document.querySelector("#prod_remark").value)
        data.push(document.querySelector("#prod_machine").value)

        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();
        // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

        var db = null
        var results = []


        db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
        db.run("INSERT INTO production('date','month','year','production','remark','machine') VALUES (?,?,?,?,?,?)",data,function(err){
            if(err){
                $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
                console.error(err.message)
            }
            $('#ok').attr("data-type", "success").attr("data-message", "Log has been saved.").attr("data-title", "Success! ").click()
            document.querySelector("#prod_date").value = ""
            document.querySelector("#prod_date").classList.remove("is-valid")
            document.querySelector("#production").value = ""
            document.querySelector("#production").classList.remove("is-valid")
            document.querySelector("#prod_remark").value = ""
            document.querySelector("#prod_machine").options[0].selected = true
            document.querySelector("#prod_machine").classList.remove("is-valid")
        });

        db.close()
    }
}
function checkIfValid(id){
    var pattern = document.getElementById(id).getAttribute('pattern').substr(1,document.getElementById(id).getAttribute('pattern').length - 2 )
    var val = document.getElementById(id).value

    var reg = new RegExp("["+pattern+"]","g")
    var antireg = new RegExp("[^"+pattern+"]", "g")

    if(val.match(reg) && !val.match(antireg)){
        document.getElementById(id).classList.remove("is-invalid");
        document.getElementById(id).classList.add("is-valid");
    }
    else{
        document.getElementById(id).classList.add("is-invalid");
        document.getElementById(id).classList.remove("is-valid");
    }
}

function checkIfFileSelected(id){
    var input = document.getElementById(id)
    var extension = input.value.substring(input.value.length - 4, input.value.length)
    if(input.value !== "" && extension === 'neon'){
        input.classList.remove("is-invalid")
        input.classList.add("is-valid")
    }
    else{
        input.classList.remove("is-valid")
        input.classList.add("is-invalid")
    }
}

function checkIfDataAndTimeValid(id){
    if(document.getElementById(id).value !== ""){
        document.getElementById(id).classList.add("is-valid")
        document.getElementById(id).classList.remove("is-invalid")
    }
    else{
        document.getElementById(id).classList.add("is-invalid")
        document.getElementById(id).classList.remove("is-valid")
    }
}

function setCopyright(){
    var moment = require("moment")
    var date = new Date()
    var year = moment(date).format("YYYY")
    document.getElementById("footer").innerHTML = "<span>Copyright © 2019 - " + year + "  Mewael Tsegay. All rights reserved.</span>"
}

function checkIfMachineSelected(id){
    if(document.getElementById(id).options.selectedIndex === 0){
        document.getElementById(id).classList.add("is-invalid")
        document.getElementById(id).classList.remove("is-valid")
    }
    else{
        document.getElementById(id).classList.add("is-valid")
        document.getElementById(id).classList.remove("is-invalid")
    }
}

function checkIfOilSelected(id){
    if(document.getElementById(id).options.selectedIndex === 0){
        document.getElementById(id).classList.add("is-invalid")
        document.getElementById(id).classList.remove("is-valid")
    }
    else{
        document.getElementById(id).classList.add("is-valid")
        document.getElementById(id).classList.remove("is-invalid")
    }
}

function checkFormValidity(){
    var form = document.getElementById("needs-validation")
    var allInputs = form.getElementsByTagName("input")
    var allSelect = form.getElementsByTagName("select")

    var res = []

    res.push(allSelect[0].classList.contains('is-valid'))

    for(var i = 0;i <= allInputs.length - 1; i++){
        res.push(allInputs[i].classList.contains('is-valid'))
    }

    for(var j=0; j<=res.length-1; j++){
        if(res[j] == false){
            return false
            break
        }
    }
}
function checkFormValidity2(){
    var form = document.getElementById("needs-validation2")
    var allInputs = form.getElementsByTagName("input")

    var res = []

    for(var i = 0;i <= allInputs.length - 1; i++){
        res.push(allInputs[i].classList.contains('is-valid'))
    }

    for(var j=0; j<=res.length-1; j++){
        if(res[j] == false){
            return false
            break
        }
    }
}
function retrieveLogs(){
    var dataset = [["1","2","3","4","5","6","7","8","9","0","11","12","12","14","15","16","17","18","19","20","21"]]
    $("#dataTable").dataTable({
        data: dataset
    })
    // const python = require('child_process').spawn('python', [path.join(__dirname,'/py/main.py'), '-d']);
    // python.stdout.on('data', function (data) {
    //     var tabledata = ""
    //     var logs = JSON.parse(data)
    //     console.log(logs)
    //     $("#dataTable").dataTable({
    //         "data": dataset
    //     })
    // })
    //
    // python.stderr.on('data', (data) => {
    //     console.error(` stderr: ${data}`);
    // })
    //
    // python.on('close', (code) => {
    //     if (code === 0) {
    //
    //     } else {
    //         $('#ok').attr("data-type", "danger").attr("data-message", "Something went wrong, try again.").attr("data-title", "Error! ").click()
    //     }
    //     console.log(`child process exited with code ${code}`);
    // })
    // var table = $("#dataTable").DataTable()
    // const fs = require('fs');
    // const initSqlJs = require('sql.js');
    // const filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));
    //
    // var db = null
    // var results = []
    //
    // initSqlJs().then(function(SQL){
    //     // Load the db
    //     db = new SQL.Database(filebuffer);
    //     let res = db.prepare("SELECT * FROM logs");
    //     while(res.step()){
    //         var row = res.getAsObject();
    //         var result = [];
    //         result.push(row.date);
    //         result.push(row.time);
    //         result.push(row.machine);
    //         result.push(row.low_pressure);
    //         result.push(row.temperature_low);
    //         result.push(row.high_pressure);
    //         result.push(row.temperature_high);
    //         result.push(row.oil_pressure);
    //         result.push(row.oil_level);
    //         result.push(row.current_l1);
    //         result.push(row.current_l2);
    //         result.push(row.current_l3);
    //         result.push(row.kwh_start);
    //         result.push(row.kwh_end);
    //         result.push(row.kwh_end - row.kwh_start);
    //         result.push(row.kvarh_start);
    //         result.push(row.kvarh_end);
    //         result.push(row.kvarh_end - row.kvarh_start);
    //         result.push(row.water_consumption);
    //         result.push(row.exp_value_temp);
    //         result.push(row.remark);
    //
    //         // results.push(result)
    //
    //         // table.row.add(result);
    //
    //     }
    //     // table.draw()
    // });
    // // t.row.add(results).draw(false)
    // console.log(results)
    // $("#dataTable").DataTable().rows.add(results).draw()

}

function retrieveProductionHistory(){
    var t = $("#prodDataTable").DataTable()
    const fs = require('fs');
    const sqlite3 = require('sqlite3').verbose();
    var db = null
    var results = []


    db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
    db.serialize(() => {
        db.each(`Select * from production`, (err, row) => {
            if (err) {
                console.error(err.message);
            }
            var result = []
            result.push(row.date)
            result.push(row.machine)
            result.push(row.production)
            result.push(row.remark)

            results.push(result)

            t.row.add(result)
        });
    });
    t.draw()
    console.log(results)
}

function createChart(){
    const sqlite3 = require('sqlite3').verbose()
    const dateformat = require('dateformat')
    const moment = require('moment')
    // var filebuffer = fs.readFileSync(path.join(__dirname,'py/neon.db'));

    var db = null
    var kvarh = []
    var kwh = []
    var water = []
    var dates = []
    var production = []
    var curr_month = moment().format("M")
    var prev_month = moment().subtract(1, 'months').format("M")
    var curr_year = moment().format("YYYY")
    var prev_year = moment().subtract(1, 'months').format("YYYY")


    db = new sqlite3.Database(path.join(__dirname,"py/neon.db"))
    var q = "with initial as (SELECT max(power.kvarh) - min(power.kvarh) as kvarh_initial,max(power.kwh) - min(power.kwh) as kwh_initial from power where power.month=? and power.year=?), final as (SELECT max(power.kvarh) - min(power.kvarh) as kvarh_final,max(power.kwh) - min(power.kwh) as kwh_final from power where power.month=? and power.year=?), prod_init as (select sum(production) as production_initial from production where production.month=? and production.year=?), prod_final as (select sum(production) as production_final from production where production.month=? and production.year=?),water_init as (select sum(logs.water_consumption) as water_initial from logs where logs.month =? and logs.year = ?), water_final as (select sum(logs.water_consumption) as water_final from logs where logs.month = ? and logs.year = ?)select round(100*((kvarh_final - kvarh_initial)/kvarh_initial),0) as kvarh_perc,round(100*((kwh_final - kwh_initial)/kwh_initial),0) as kwh_perc,round(100*((water_final - water_initial)/water_initial),0) as water_perc,round(100*((production_final - production_initial)/production_initial),0) as production_perc from initial,final,prod_init,prod_final,water_init,water_final;"
    db.get(q,[prev_month,prev_year,curr_month,curr_year,prev_month,prev_year,curr_month,curr_year,prev_month,prev_year,curr_month,curr_year],(err,row) => {
        console.log(row)
        if(row.production_perc > 0 ){
            $("#prod_perc").addClass("bgc-green-50 c-green-500")
            document.querySelector("#prod_perc").innerText = "+" + row.production_perc + "%"
        }
        if(row.production_perc == 0){
            $("#prod_perc").addClass("bgc-purple-50 c-purple-500")
            document.querySelector("#prod_perc").innerText = "~" + row.production_perc + "%"
        }
        if(row.production_perc < 0){
            $("#prod_perc").addClass("bgc-red-50 c-red-500")
            document.querySelector("#prod_perc").innerText = row.production_perc + "%"
        }
        if(row.kwh_perc < 0 ){
            $("#kwh_perc").addClass("bgc-green-50 c-green-500")
            document.querySelector("#kwh_perc").innerText = row.kwh_perc + "%"
        }
        if(row.kwh_perc == 0){
            $("#kwh_perc").addClass("bgc-purple-50 c-purple-500")
            document.querySelector("#kwh_perc").innerText = "~" + row.kwh_perc + "%"
        }
        if(row.kwh_perc > 0){
            $("#kwh_perc").addClass("bgc-red-50 c-red-500")
            document.querySelector("#kwh_perc").innerText = "+" + row.kwh_perc + "%"
        }
        if(row.kvarh_perc < 0 ){
            $("#kvarh_perc").addClass("bgc-green-50 c-green-500")
            document.querySelector("#kvarh_perc").innerText = row.kvarh_perc + "%"
        }
        if(row.kvarh_perc == 0){
            $("#kvarh_perc").addClass("bgc-purple-50 c-purple-500")
            document.querySelector("#kvarh_perc").innerText = "~" + row.kvarh_perc + "%"
        }
        if(row.kvarh_perc > 0){
            $("#kvarh_perc").addClass("bgc-red-50 c-red-500")
            document.querySelector("#kvarh_perc").innerText = "+" + row.kvarh_perc + "%"
        }
        if(row.water_perc < 0 ){
            $("#water_perc").addClass("bgc-green-50 c-green-500")
            document.querySelector("#water_perc").innerText = row.water_perc + "%"
        }
        if(row.water_perc == 0){
            $("#water_perc").addClass("bgc-purple-50 c-purple-500")
            document.querySelector("#water_perc").innerText = "~" + row.water_perc + "%"
        }
        if(row.water_perc > 0){
            $("#water_perc").addClass("bgc-red-50 c-red-500")
            document.querySelector("#water_perc").innerText = "+" + row.water_perc + "%"
        }
    })
    db.all("with pow as (select power.month || '/' || power.date || '/' || power.year as date1, ifnull(round((power.kvarh - lag(power.kvarh,1) over (order by power.year,power.month,power.date)),1),0) as kvarh, ifnull(round((power.kwh - lag(power.kwh,1) over (order by power.year,power.month,power.date)),1),0) as kwh from power group by power.year,power.month,power.date order by power.year,power.month,power.date asc),prod as (select production.month || '/' || production.date || '/' || production.year as date2, production.production from production GROUP by production.year,production.month,production.date order by production.year,production.month,production.date asc),water as (select logs.month || '/' || logs.date || '/' || logs.year as date3, sum(logs.water_consumption) as water_consumption from logs GROUP by logs.year,logs.month,logs.date order by logs.year,logs.month,logs.date asc)select date1,kvarh,kwh,production,water_consumption from pow,prod,water where (date1 = date2 and date1 = date3)",[],(err,rows) =>{
        if(err){
            console.log(err.message)
        }
        rows.forEach((row)=>{
            kvarh.push(row.kvarh)
            kwh.push(row.kwh)
            water.push(row.water_consumption)
            production.push(row.production)
            var date = new Date(row.date1)
            dates.push(dateformat(date,"yyyy-mm-dd"))
        })
    })
    db.close()
    var options = {
        series: [{
            name: "Kvarh",
            data: kvarh
            },
            {
                name: "Production",
                data: production
            },
            {
                name: 'Kwh',
                data: kwh
            },
            {
                name: 'Water Consumption',
                data: water
            }
        ],
        chart: {
            height: 620,
            type: 'line',
            toolbar:{
                tools: {
                    reset: false,
                    download: false
                }
            },
            zoom: {
                enabled: true
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: [5, 7, 5,5],
            curve: 'straight',

        },
        legend: {
            tooltipHoverFormatter: function(val, opts) {
                return val + ' - <strong>' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + '</strong>'
            }
        },
        markers: {
            size: 0,
            hover: {
                sizeOffset: 6
            }
        },
        xaxis: {
            type: "datetime",
            categories: dates
        },
        tooltip: {
            y: [
                {
                    title: {
                        formatter: function (val) {
                            return val;
                        }
                    }
                },
                {
                    title: {
                        formatter: function (val) {
                            return val + " (Tons)";
                        }
                    }
                },
                {
                    title: {
                        formatter: function (val) {
                            return val;
                        }
                    }
                },
                {
                    title: {
                        formatter: function (val) {
                            return val + " (Meter Cube)";
                        }
                    }
                }
            ]
        },
        grid: {
            borderColor: '#f1f1f1',
        }
    };
    var chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
}
