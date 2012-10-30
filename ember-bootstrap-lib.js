Bootstrap = {}
/* Bootstrap */
Bootstrap.LoadingController = Em.Controller.extend({
    percent:0
})

Bootstrap.Bar = Em.View.extend({
    classNames:['bar'],
    percentBinding:'parentView.controller.percent',
    targetViewBinding:'parentView.controller.targetView',
    _percent_observer:function(){
        this.$().css('width', this.get('percent')+'%')
    }.observes('percent'),
})

Bootstrap.LoadingView = Em.View.extend({
    classNames:['progress', 'progress-striped', 'active']
})

Bootstrap.SrcBar = Bootstrap.Bar.extend({
    didInsertElement:function() {  
        var targetView = this.get('targetView'),
            items = targetView.$('img,script,iframe'),
            n = items.length,
            bar = this

        if (n<1) {
            /*  Multiple items 
                */
            var queue = Em.ArrayController.create({
                content:items.toArray(),
                arrayDidChange:function(start, removeCount, addCount) {
                    var incomplete = this.get('length'),
                        percent = incomplete ? 100/incomplete : 100
                    if (percent === 100) {
                        targetView.set('complete', true)
                    } else {
                        bar.set('percent', percent)
                    }
                }
            })            
            items.load(function() {
                queue.removeObject(this)
            })
        } else if (n === 1) {
            /*  We can't actually detect the progress of a single
                item so show a complete but spinning loading bar */
            this.set('percent', 100)
            items.load(function() {
                targetView.set('complete', true)
            })
        } else {
            /*  Nothing valid to load... 
                go directly to complete??? */
            targetView.set('complete', true)
        }
    }
})

// http://api.jquery.com/load-event/
// Works with images, scripts, frames, iframes, and the window object


Em.Handlebars.registerHelper('loading', function(path, options) {
    var targetView = Ember.Handlebars.getPath(this, path, options)
    return !targetView.get('complete') ? options.inverse(this) : Em.Handlebars.helpers['view'](Bootstrap.SrcLoadingView.extend({targetView:targetView}), options);
});

/*
{{#loading view.myimage}}
    {{view Bootstrap.SrcBar}}
{{else}}
    Finished!!!
{{/loading}}
    

*/

Bootstrap.AjaxLoadingView = Bootstrap.LoadingView.extend({
    bar:Boostrap.Bar.extend({
        didInsertElement:function() {
            var view = this
            this.$().bind("ajaxProgress", function(jqEvent, progressEvent, jqXHR) {
                if (progressEvent.lengthComputable) {
                    view.set('percent', Math.round(progressEvent.loaded / progressEvent.total * 100))
                }
            })   
        }
    })
})