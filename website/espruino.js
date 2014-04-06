if (Meteor.isClient) {

  Template.espruino.helpers({
    'btnDown': function() {
      var btn = Pins.findOne('BTN');
      if (btn)
        return btn.state;
      else
        return 'loading';
    },
    'leds': function() {
      return Pins.find({_id: /^LED/});
    }
  });

  Template.led.events({
    'click': function() {
      Pins.update(this._id, { $set: { state: !this.state } });
    }
  });

  Template.led.helpers({

    state: function() {
      var led = Pins.findOne(this._id);
      console.log(led);
      return led.state;
    },

    style: function() {
      var fill, filter, opacity;
      if (this.state) {

        if (this.color == 'red')
          fill = '#ff0000';
        else if (this.color == 'green')
          fill = '#00ff00';
        else
          fill = '#0000ff';

        filter = 'url(#filter3805)';
        opacity = 0.8;

      } else {

        if (this.color == 'red')
          fill = '#aa0000';
        else if (this.color == 'green')
          fill = '#00aa00';
        else
          fill = '#0000aa';

        filter = 'none';
        opacity = 0.95;

      }
      return 'fill:'+fill+';filter:'+filter+';opacity:'+opacity+';';
    }

  });

//  Pins = new Meteor.Collection('pins');
//  return;

  // 2nd DDP connection.  But ultimately we'll do
  // server-to-server DDP, haven't written that code yet
  espruino = DDP.connect('http://192.168.1.121/');
  Pins = new Meteor.Collection('pins', espruino);
  espruino.subscribe('pins');
}

/*


sockjs.sendAll({
	"msg":"added",
	"collection":"meteor_autoupdate_clientVersions",
	"id":"95a65a07eb6f4f77996e1b6696506679de5197a8",
	"fields":{"current":true}}"
});

sockjs.sendAll({
	"msg":"ready",
	"subs":["Ns3iApyeuTsYovqsn"]
});
*/
