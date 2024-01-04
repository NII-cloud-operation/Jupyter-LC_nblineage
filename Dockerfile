FROM jupyter/scipy-notebook:latest

# nblineage test container

USER root

RUN mkdir -p /tmp/kernels/python3-wrapper /tmp/wrapper-kernels/python3 && \
    echo '{"display_name":"Python 3 (LC_wrapper)","language":"python","argv":["/opt/conda/bin/python","-m","lc_wrapper","-f","{connection_file}"]}' > /tmp/kernels/python3-wrapper/kernel.json && \
    echo '{"display_name":"Python 3","language":"python","argv":["/opt/conda/bin/python","-m","lc_wrapper","-f","{connection_file}"]}' > /tmp/wrapper-kernels/python3/kernel.json

RUN echo "c.MultiKernelManager.kernel_manager_class = 'lc_wrapper.LCWrapperKernelManager'" > $CONDA_DIR/etc/jupyter/jupyter_notebook_config.py && \
    echo "c.KernelManager.shutdown_wait_time = 10.0" >> $CONDA_DIR/etc/jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.kernel_spec_manager_class = 'lc_wrapper.LCWrapperKernelSpecManager'" >> $CONDA_DIR/etc/jupyter/jupyter_notebook_config.py

### extensions for jupyter
RUN pip --no-cache-dir install jupyter_nbextensions_configurator \
    git+https://github.com/NII-cloud-operation/Jupyter-LC_wrapper \
    git+https://github.com/NII-cloud-operation/Jupyter-multi_outputs \
    git+https://github.com/NII-cloud-operation/Jupyter-LC_notebook_diff.git \
    git+https://github.com/NII-cloud-operation/sidestickies.git

### Install nblineage
COPY . /tmp/nblineage
RUN pip install --no-cache-dir /tmp/nblineage && \
    jupyter labextension enable nblineage && \
    jupyter nblineage quick-setup --sys-prefix && \
    npm cache clean --force

RUN jupyter nbclassic-extension install --py jupyter_nbextensions_configurator --sys-prefix && \
    jupyter nbclassic-extension enable --py jupyter_nbextensions_configurator --sys-prefix && \
    jupyter nbclassic-extension install --py lc_wrapper --sys-prefix && \
    jupyter nbclassic-extension enable --py lc_wrapper --sys-prefix && \
    jupyter nbclassic-extension install --py lc_multi_outputs --sys-prefix && \
    jupyter nbclassic-extension enable --py lc_multi_outputs --sys-prefix && \
    jupyter nbclassic-extension install --py lc_notebook_diff --sys-prefix && \
    jupyter kernelspec install /tmp/kernels/python3-wrapper --sys-prefix && \
    jupyter wrapper-kernelspec install /tmp/wrapper-kernels/python3 --sys-prefix && \
    fix-permissions /home/$NB_USER

USER $NB_USER
