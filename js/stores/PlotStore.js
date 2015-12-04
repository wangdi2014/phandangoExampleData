const EventEmitter = require('events').EventEmitter;
const assign = require('object-assign');
const Dispatcher = require('../dispatcher/dispatcher');
const blocksToLineGraphData = require('../components/genomic/parse.gubbins.js').blocksToLineGraphData;
const GenomeStore = require('./genome.js');
const RawDataStore = require('./RawDataStore.js');

const allYvalues = {};
const maxYvalues = {};

const PlotStore = assign({}, EventEmitter.prototype, {
  emitChange: function () {
    this.emit('change');
  },

  addChangeListener: function (callback) {
    this.on('change', callback);
  },

  removeChangeListener: function (callback) {
    this.removeListener('change', callback);
  },

  getPlotYvalues: function (plotName) {
    return allYvalues[plotName];
  },

  getPlotMaxY: function (plotName) {
    return maxYvalues[plotName];
  },

  isPlotActive: function (plotName) {
    return plotName in maxYvalues ? true : false;
  },

});


function findMaxValueOfLineGraph(yVals) {
  let max = 1;
  for (let i = 0; i < yVals.length; i++) {
    if (yVals[i] > max) {
      max = yVals[i];
    }
  }
  return max;
}

Dispatcher.register(function (payload) {
  if (payload.actionType === 'save_plotYvalues') {
    allYvalues[payload.plotName] = payload.plotYvalues;
    // setTimeout????
    maxYvalues[payload.plotName] = findMaxValueOfLineGraph(payload.plotYvalues);
    // maxYvalues[payload.plotName] = 1;
    // for (var i=0; i<payload.plotYvalues.length; i++) {
    //  if (payload.plotYvalues[i]>maxYvalues[payload.plotName]) {
    //    maxYvalues[payload.plotName] = payload.plotYvalues[i]
    //    // console.log("max updated at pos",i,"to",maxYvalues[payload.plotName])
    //  }
    // }
    PlotStore.emitChange();
  } else if (payload.actionType === 'phylocanvas_nodes_selected') {
    // WAIT FOR TAXA_LOCATIONS TO UPDATE FIRST
    Dispatcher.waitFor([ GenomeStore.dispatchToken ]);
    const selectedTaxa = GenomeStore.getSelectedTaxaNames();
    if (selectedTaxa === undefined) {
      if (allYvalues.subtree === undefined && maxYvalues.subtree === undefined) {
        return;
      }
      allYvalues.subtree = undefined;
      maxYvalues.subtree = undefined;
      PlotStore.emitChange();
    } else {
      // console.log(GenomeStore.getSelectedTaxaNames());
      setTimeout(function () {
        const genomicData = RawDataStore.getParsedData('genomic');
        // console.log('genomicData',genomicData)
        const yValues = blocksToLineGraphData(genomicData[1], genomicData[0][1], selectedTaxa);
        allYvalues.subtree = yValues;
        maxYvalues.subtree = findMaxValueOfLineGraph(yValues);
        // console.log('subtree has max Y value of ', maxYvalues.subtree);
        PlotStore.emitChange();
      }, 0);
    }
    // PlotStore.emitChange();
  }
});

module.exports = PlotStore;

