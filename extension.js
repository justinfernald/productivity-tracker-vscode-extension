// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// const fs = require("fs");
const path = require("path");

let tempKeyCount = 0;
let statusBarItem;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // console.log("active");
    if (!context.globalState.get("keyData"))
        context.globalState.update("keyData", []);

    let disposable = vscode.commands.registerCommand(
        "productivity-tracker.show",
        () => {
            vscode.window.showInformationMessage("Productivity Tracker!");
            const panel = vscode.window.createWebviewPanel(
                "productivityTracker",
                "Productivity Tracker",
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [
                        vscode.Uri.file(
                            path.join(context.extensionPath, "media")
                        ),
                    ],
                }
            );

            panel.webview.html = setupWebview(context, panel);
            console.log(panel.webview.html);
        }
    );

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.tooltip = `Updates every 10 seconds to show you have many keys you have pressed in an editor for the past hour`;
    updateStatusBar(context);

    vscode.workspace.onDidChangeTextDocument(() => {
        tempKeyCount++;
    });

    setInterval(() => {
        let keyData = [
            ...context.globalState.get("keyData"),
            {
                time: Date.now(),
                keys: tempKeyCount,
            },
        ];

        context.globalState.update("keyData", keyData);
        tempKeyCount = 0;
        updateStatusBar(context, keyData);
    }, 10000);

    context.subscriptions.push(disposable);
}

function updateStatusBar(context, keyData) {
    if (!keyData) keyData = context.globalState.get("keyData");
    let filtered = keyData
        .filter((dataPoint) => dataPoint.time > Date.now() - 3600000)
        .map((dataPoint) => dataPoint.keys);
    let sum = filtered.reduce((a, b) => a + b);
    statusBarItem.text = `${sum} Char/Hr`;
    statusBarItem.show();
    return sum;
}

function setupWebview(context, panel) {
    let keyData = context.globalState.get("keyData");
    let filtered = keyData.filter(
        (dataPoint) => dataPoint.time > Date.now() - 2592000000
    );
    console.log(filtered);
    let oneDay = 86400000;
    let newData = [];
    for (let day = 1; day <= 30; day++) {
        console.log(day);
        let dayFilter = filtered.filter(
            (dataPoint) =>
                dataPoint.time >
                    Date.now() - (2592000000 - (day - 1) * oneDay) &&
                dataPoint.time < Date.now() - (2592000000 - day * oneDay)
        );
        console.log(day);
        let keys = dayFilter.reduce((a, b) => a + b.keys, 0);
        newData.push({
            day,
            keys,
        });
    }

    console.log(newData);

    return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Productivity Statistics</title>
				<script src="
					${panel.webview.asWebviewUri(
                        vscode.Uri.file(
                            path.join(
                                context.extensionPath,
                                "media",
                                "chart.js"
                            )
                        )
                    )}">
				</script>
			</head>
			<body>
				<h1>Productivity Stats</h1>
				<canvas id="key-chart"></canvas>
				<p>
					Data for the last 30 days with 30 being the most recent day. Hover over to see the key press value.
					Shows the amount of key presses in text editor for the day.
				</p>
				<script>
					var ctx = document.getElementById('key-chart').getContext('2d');
					var chart = new Chart(ctx, {
						// The type of chart we want to create
						type: 'line',

						// The data for our dataset
						data: {
							labels: [${newData.map((dataPoint) => dataPoint.day)}],
							datasets: [{
								label: 'Key Time Dataset',
								backgroundColor: 'rgb(255, 99, 132)',
								borderColor: 'rgb(255, 99, 132)',
								data: [${newData.map((dataPoint) => dataPoint.keys)}]
							}]
						},

						// Configuration options go here
						options: {
							legend: {
								display: false
							},
							scales: {
								xAxes: [ {
									display: true,
									scaleLabel: {
										display: true,
										labelString: 'Key Press (Char/Day)'
									}
								} ],
								yAxes: [ {
									display: true,
									scaleLabel: {
										display: true,
										labelString: 'Days (1 - 30)'
									}
								} ]
							}
						}
					});
				</script>
			</body>
		</html>`;
}

exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
