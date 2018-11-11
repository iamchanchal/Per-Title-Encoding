var inputFile = "../resource/BBB2min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var util = require('util');
var ffmpeg = require('fluent-ffmpeg');
var outputFile = "../resource/merged480_18.mp4";

var logFile = fs.createWriteStream('../resource/log.txt', { flags: 'a' });
var logStdout = process.stdout;

console.log = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
}

var encoding = ffmpeg(inputFile)
    .size('640x480')
    .addOptions('-crf 18')
    .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('progress', function(progress) {
        console.log(JSON.stringify(progress));
    })
    .on('data', function (data) {
        var frame = new Buffer(data).toString('base64');
        console.log(frame);
    })
    .on('error', function (err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function (err,stdout, stderr) {
        console.log('Processing finished !');
        console.log('This transcode scored a PSNR of: ');
        console.log(JSON.stringify(stdout, null, " "));
        psnrcal();

    })
    .save(outputFile);

function psnrcal(){

    const exec = require('child_process').exec;
    const child = exec('FFREPORT=file=../resource/psnr18_1.log ffmpeg -i' + ${inputFile} +'-i'+ ${outputFile} +'-lavfi \'[1]scale=1920:1080[a];[0][a]psnr\' -f null -',
        (error, stdout, stderr) => {
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });
}