var inputVideoFile = "../resource/BBB2min.mp4";
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var loopEncode = function(i,length,breadth) {
    if (i > 40) {
        return 1;
    }
    var outputVideoFile = "../resource/CRFoutputOld"+length+"x"+breadth+"_"+i+".mp4";


//saving console log message in a text file
    var logFile = "../resource/logOld"+length+"x"+breadth+"_"+i+".txt";

    var util = require('util');
    var logFile = fs.createWriteStream(logFile, { flags: 'a' });
    var logStdout = process.stdout;
    console.log = function () {
        logFile.write(util.format.apply(null, arguments) + '\n');
        logStdout.write(util.format.apply(null, arguments) + '\n');
    }
    console.error = console.log;

//CRF encoding the input file by downscaling and printing PSNR in a text file
    var crf = "-crf "+i;
    var resolution = length+"x"+breadth;
    var encoding = ffmpeg(inputVideoFile)
        .size(resolution)
        .addOption(crf)
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

        .save(outputVideoFile);

//method to calculate PSNR by upscaling the output video file and printing PSNR in a text file
    function psnrcal() {
        var psnrAfter = ffmpeg(inputVideoFile)
            .input(outputVideoFile)
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
            .on('end', function (err, stdout, stderr, metadata) {
                console.log('Processing for PSNR finished !');

                console.log(JSON.stringify(stdout, null, " "));
                var averagePSNR = JSON.stringify(stdout, null, " ").match("average:(.*)min:");
                var fs = require("fs");
                var psnrFile = "../resource/PSNROld"+length+"x"+breadth+"_"+i+".txt";
                var stream = fs.createWriteStream(psnrFile, {flags:'a'});
                stream.write(averagePSNR[1]+ "\n");
                ffmpeg.ffprobe(outputVideoFile, function(err, metadata) {

                    stream.write(metadata.streams[0].bit_rate+ "\n");
                    //console.log(metadata.format.duration);
                });

            })
            .output('nowhere')
            .run();

/*        const execFile = require('child_process').execFile;
        const str = "psnr";
        const child = execFile('ffmpeg', ['-i', inputVideoFile , '-i' , outputVideoFile , '-lavfi', str, '-f','null -', '-nowhere'], (error, stdout, stderr) => {
            if (error) {
                console.error('stderr: =============================', stderr);
                throw error;
            }
            console.log('stdout: ==========================', stdout);
        });*/


    }
    loopEncode(i+5,length,breadth);
}

loopEncode(18,640,480);
// loopEncode(18,1280,720);