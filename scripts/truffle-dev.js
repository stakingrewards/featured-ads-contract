StakingRewardsToken.deployed().then(function(instance){return instance.mintTo('0xe53f6952f7fa230755935ebbb8cb9124623ff0b4', parseInt(Date.now() / 1000) +10, 1586945100, '', 1, '', 0);});
StakingRewardsToken.deployed().then(function(instance){return instance.mintTo('0xe53f6952f7fa230755935ebbb8cb9124623ff0b4', parseInt(Date.now() / 1000) +10, 1586945100, '', 1, '', 1);});

StakingRewardsToken.deployed().then(function(instance){return instance.getCurrent();}).then(function(curr){return curr.toString()});
StakingRewardsToken.deployed().then(function(instance){return instance.getStartdate(1);}).then(function(curr){return curr.toString()});
StakingRewardsToken.deployed().then(function(instance){return instance.getCurrentAsset();}).then(function(curr){return curr.toString()});
StakingRewardsToken.deployed().then(function(instance){return instance.getNow();}).then(function(curr){return curr.toString()});

StakingRewardsToken.deployed().then(function(instance){return instance.updateAds();}).then(function(e) {return e.logs});


StakingRewardsToken.deployed().then(function(instance){return instance.claimAd(1, 'tezos');});
StakingRewardsToken.deployed().then(function(instance){return instance.claimAd(2, 'hotstake');});

StakingRewardsToken.deployed().then(function(instance){return instance.getCurrentAd(0);});
StakingRewardsToken.deployed().then(function(instance){return instance.getCurrentAd(1);});