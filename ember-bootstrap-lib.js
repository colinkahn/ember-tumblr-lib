Bootstrap = {}
/* Bootstrap */
Bootstrap.LoadingController = Em.Controller.extend({
    percent:0
})

Bootstrap.LoadingView = Em.View.extend({
    classNames:['progress', 'progress-striped', 'active'],
    template:Em.Handlebars.compile('{{view view.bar}}'),
    bar:Em.View.extend({
        classNames:['bar'],
        percentBinding:'parentView.controller.percent',
        _percent_observer:function(){
            this.$().css('width', this.get('percent')+'%')
        }.observes('percent'),
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