const  { remote } = require('electron')

function runPython(jsonn){
    const python = remote.require('child_process').spawn('python', ['assets/py/main.py -i'], jsonn);
    python.stdout.on('data', function(data){
        console.log("python response: ", data.toString('utf8'));
        result.textContent = data.toString('utf8');
    })

    python.stderr.on('data', (data) => {
        console.error(` stderr: ${data}`);
    })

    python.on('close', (code) =>{
        console.log(`child process exited with code ${code}`);
    })
}
