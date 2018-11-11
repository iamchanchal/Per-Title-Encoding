var firstFile = "../resource/BBB2min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var secondFile = "../resource/CosmosLaundromat480_17.mp4";
var outPath = "../resource/merged480_18.mp4";var ffmpeg = require('fluent-ffmpeg');
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
        console.log('Processing CRF encoding finished !');
        console.log(JSON.stringify(stdout, null, " "));
        psnrcal();

    })
    .save(outPath);

function psnrcal() {
    var psnrAfter = ffmpeg(firstFile)
        .input(outPath)
        .complexFilter('[1]scale=1920:1080[a];[0][a]psnr')
        .addOption('-f', 'null')


        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function (progress) {
            console.log(JSON.stringify(progress));
        })
        .on('data', function (data) {
            var frame = new Buffer(data).toString('base64');
            console.log(frame);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        .on('end', function (err, stdout, stderr) {
            console.log('Processing for PSNR finished !');

            console.log(JSON.stringify(stdout, null, " "));
            var averagePSNR = JSON.stringify(stdout, null, " ").match("average:(.*)min:");
            var fs = require("fs");
            fs.writeFile("../resource/PSNRvalue.txt", averagePSNR[1], (err) => {
                if (err) {
                    console.error(err);
                    return;
                };

            });

        })
        .output('nowhere')
        .run();
}