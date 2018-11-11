var firstFile = "../resource/BBB2min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var secondFile = "../resource/CosmosLaundromat480_17.mp4";
var outPath = "../resource/merged480_18.mp4";var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var stream  = fs.createWriteStream('../resource/psnr.log');
var fs = require('fs');
var util = require('util');
var logFile = fs.createWriteStream('log.txt', { flags: 'a' });
// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
}
console.error = console.log;
/* var testPSNR = ffmpeg(firstFile)
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
        // var regex = /LPSNR=Y:([0-9\.]+) U:([0-9\.]+) V:([0-9\.]+) \*:([0-9\.]+)/
        //var psnr = stdout.match(regex);
        console.log('This transcode scored a PSNR of: ');
        console.log(JSON.stringify(stdout, null, " "));

    })
    .save(outPath); */

/* const exec = require('child_process').exec;
const child = exec('FFREPORT=file=../resource/psnr18.log ffmpeg -i /home/chanchal/FluentFfmpeg/node-fluent-ffmpeg-master/resource/BBB2min.mp4 -i /home/chanchal/FluentFfmpeg/node-fluent-ffmpeg-master/resource/merged480_18_scale.mp4 -lavfi \'[1]scale=1920:1080[a];[0][a]psnr\' -f null -',
    (error, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        if (error !== null) {
            console.log(`exec error: ${error}`);
        }
    }); */

var encoding = ffmpeg(firstFile)
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
    .save(outPath);


function psnrcal(){

    const exec = require('child_process').exec;
    const child = exec('FFREPORT=file=../resource/psnr18_1.log ffmpeg -i /home/chanchal/FluentFfmpeg/node-fluent-ffmpeg-master/resource/BBB2min.mp4 -i /home/chanchal/FluentFfmpeg/node-fluent-ffmpeg-master/resource/merged480_18.mp4 -lavfi \'[1]scale=1920:1080[a];[0][a]psnr\' -f null -',
        (error, stdout, stderr) => {
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });
}

var psnrAfter = ffmpeg(firstFile)
    .input(outPath)
    .outputOptions('psnr')
    .complexFilter('-filter_complex null -')
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
    .run();